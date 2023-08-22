---
title: IV Trying to Implement Unmountat
sidebar_position: 4
---

# Try to create "unmountat" with the new Linux mount API

This continues from [implementing mountat with the new Linux mount API]
in an effort to improve [chroot in Buildbarn]
and mount the `/proc` and `/sys` filesystem in the input root for `REAPI` _actions_.

[implementing mountat with the new Linux mount API]: /docs/improved-chroot-in-Buildbarn/implementing-mountat/
[chroot in Buildbarn]: /docs/improved-chroot-in-Buildbarn/

## The new mount API

A short summary, see [implementing mountat] for more background.

David Howells at Redhat the "new mount API" with several new syscalls
primarily used to speed up work with namespaces and moving mounts back and forth.
The benefit (for us) is that it allows relative paths.

Announcement:
> Six (or seven) new system calls for filesystem mounting
> https://lwn.net/Articles/759499/

Note that this is not the final API but describes the background well.
The `write` call will not be used at all.
Later patch sets and the man pages explain the API better,
but some vagaries remain as we will see later.

Man pages:
> Add manpage for fsopen(2), fspick(2) and fsmount(2)
> https://lwn.net/Articles/802096/

> [MANPAGE PATCH] Add manpages for move_mount(2) and open_tree(2)
> https://lore.kernel.org/linux-man/15488.1531263249@warthog.procyon.org.uk/t/

Commit information:
> vfs: syscall: Add fsconfig() for configuring and managing a context · torvalds/linux@ecdab15
> https://github.com/torvalds/linux/commit/ecdab150fddb42fe6a739335257949220033b782

Unfortunately I have not found the official man pages anywhere.
So the risk of this article being out-of-date is looming.
Just as the announcement gave examples with `write` that does not work with the real code.

Quote the manpages (redacted):

    move_mount () call moves a mount from one place to another;
    it can also be used to attach an
    unattached mount created by
    fsmount() or open_tree() with OPEN_TREE_CLONE .

    move_mount () is called repeatedly with a file descriptor that refers to a mount object,
    then the object will be attached/moved the first time and then moved again and
    again and again, detaching it from the previous mountpoint each time.

This is where we start to implement "unmountat",
the idea is to

    A1: pick up the mount from the directory
    A2: delete the mount

    B1: pick up the mount from the directory
    B2: move it somewhere else
    B3: unmount it from there

    C1: emulate `umountat` with `fchdir` + `umount`

The first is what we would like to do, but it does not work.
The second is a half-measure that allows us to use a well-known absolute path
and use an "Indiana-Jones swap" technique
before unmounting the absolute path with good-old `unmount`.
But that does not work either.
So we use the third idea,
which does not use the new API at all.

[implementing mountat]: /docs/improved-chroot-in-Buildbarn/implementing-mountat/

## Move mount

We try the given examples (redacted):

    EXAMPLES
    The move_mount ()function can be used like the following:

    move_mount(AT_FDCWD, "/a", AT_FDCWD, "/b", 0);

    This would move the object mounted on "/a" to "/b".  It can also be used in
    conjunction with open_tree(2) open(2) with O_PATH :

    fd = open_tree(AT_FDCWD, "/mnt", 0);
    move_mount(fd, "", AT_FDCWD, "/mnt2", MOVE_MOUNT_F_EMPTY_PATH);
    move_mount(fd, "", AT_FDCWD, "/mnt3", MOVE_MOUNT_F_EMPTY_PATH);
    move_mount(fd, "", AT_FDCWD, "/mnt4", MOVE_MOUNT_F_EMPTY_PATH);

    This would attach the path point for "/mnt" to fd, then it would move the
    mount to "/mnt2", then move it to "/mnt3" and finally to "/mnt4".

We know that `move_mount` can be used to place a _mount object_ on a mount point,
that is how [mountat] is implemented, here is [official reference code].

But these examples do not seem to work.

```c
/* Move from a source directory file descriptor `s_dfd`
 * to the destination `d_dfd`.
 */

// Try to use 'move_mount' directly on the mount point.
move_mount(s_dfd, mountpoint, d_dfd, mountpoint, 0);
//     strace: move_mount(3, "proc", 6, "proc", 0)     = -1 EINVAL (Invalid argument)

// Try to use 'move_mount' on the mount file descriptor from `fspick`.
// Pick up, a so called, "filesystem configuration context".
int cfd = fspick(s_dfd, mountpoint, FSPICK_NO_AUTOMOUNT | FSPICK_CLOEXEC);
move_mount(cfd, "", d_dfd, mountpoint, 0);
//     strace: move_mount(7, "", 6, "proc", 0)         = -1 ENOENT (No such file or directory)
move_mount(cfd, "", d_dfd, mountpoint, MOVE_MOUNT_F_EMPTY_PATH);
//     strace: move_mount(7, "", 6, "proc", MOVE_MOUNT_F_EMPTY_PATH) = -1 EINVAL (Invalid argument)

// Must we create a mount again?
// So `fspick` is equivalent to `fsopen`.
// Additionally, the manpage says that we must reconfigure it
fsconfig(cfd, FSCONFIG_CMD_RECONFIGURE, NULL, NULL, 0);
int mfd = fsmount(cfd, FSMOUNT_CLOEXEC, MS_NOEXEC);
//     strace: fsmount(5, FSMOUNT_CLOEXEC, MOUNT_ATTR_NOEXEC) = -1 EBUSY (Device or resource busy)
// But `fsmount` fails, so this does not seem to be it.
```

Either way I try I get `EINVAL`

    .EINVAL
    Reserved flag specified in flags .

Which is not described very well.

[mountat]: https://github.com/meroton/prototype-mountat/blob/main/c-prototypes/mountat_dfd.c#L52
[official reference code]: https://github.com/torvalds/linux/blob/89bf6209cad66214d3774dac86b6bbf2aec6a30d/samples/vfs/test-fsmount.c#L103

## Pick up the mount

With `open_tree`:

    open_tree () picks the mount object specified by the pathname and attaches it to a new file
    descriptor or clones it and attaches the clone to the file descriptor.  The
    resultant file descriptor is indistinguishable from one produced by
    open(2) with O_PATH .

    In the case that the mount object is cloned, the clone will be "unmounted" and
    destroyed when the file descriptor is closed if it is not otherwise mounted
    somewhere by calling move_mount (2).

Just like the example above, this can be read as allowing an unmount through `move_mount`.
Though the primary use case is to clone a mount and move that.
Do we need `fsmount` in the way?

```c
// And using `open_tree` gives failures for `fsconfig` directly.
int mmmfd = open_tree(s_dfd, mountpoint, 0);
fsconfig(mmmfd, FSCONFIG_CMD_RECONFIGURE, NULL, NULL, 0);
//     strace: fsconfig(5, FSCONFIG_CMD_RECONFIGURE, NULL, NULL, 0) = -1 EBADF (Bad file descriptor)

// Try to use 'move_mount' on the tree file descriptor from 'open_tree'
int mmfd = open_tree(s_dfd, mountpoint, 0);
move_mount(mmfd, "", d_dfd, mountpoint, MOVE_MOUNT_F_EMPTY_PATH);
//    strace: move_mount(8, "", 6, "proc", MOVE_MOUNT_F_EMPTY_PATH) = -1 EINVAL (Invalid argument)
```

So we should not attempt to configure the mount file descriptor from `fsconfig`,
But we can not move it either.

## EINVAL

We fall short with this message,
the next step would be to dig into the [source code],
[debug the kernel code in a VM],
or see if the file descriptors give more information.

From the older documentation of `fsopen`,
which also said that we should write to the file descriptors
that did not work.
So this is left with some skepticism,
but to continue the work it is something to start with.

    Message Retrieval Interface

    The context file descriptor may be queried for message strings at any time by
    calling read(2) on the file descriptor.
    This will return formatted messages that are prefixed
    to indicate their class:

    "e <message>"
    An error message string was logged.

    i <message>"
    An informational message string was logged.

    w <message>"
    An warning message string was logged.

    Messages are removed from the queue as they're read.

[source code]: https://github.com/torvalds/linux/blob/master/fs/namespace.c#L4058
[debug the kernel code in a VM]: https://docs.kernel.org/dev-tools/gdb-kernel-debugging.html

## Copy mount

The only things that work with the new API is to clone the mount,
and then move the clone.
So we copy the mount, but leave the original in-place.
That is not a workable solution for us.

```c
// We can successfully move a clone, but not the original mount it seems.
int mmmfd = open_tree(s_dfd, mountpoint, OPEN_TREE_CLONE);
move_mount(mmmfd, "", d_dfd, mountpoint, MOVE_MOUNT_F_EMPTY_PATH);
```

## Further investigation

Google does not help in finding many uses cases,
but there are a few emails with newer dates:

    `open_tree`: https://lore.kernel.org/linux-man/159827188271.306468.16962617119460123110.stgit@warthog.procyon.org.uk/
    `move_mount`: https://lore.kernel.org/linux-man/159827189025.306468.4916341547843731338.stgit@warthog.procyon.org.uk/

But they have the same examples

There is also the `lxc` project, which has the most code that use the new API.
But they do not use an "unmountat" function.

    `create detached mount`: https://github.com/lxc/lxc/blob/main/src/lxc/mount_utils.c#L291
    `mount_at`: https://github.com/lxc/lxc/blob/main/src/lxc/mount_utils.c#L613

There is also the [path_unmountat] function in the kernel,
but to my reading this is part of the filesystem subsystem,
and not plumbed through to a syscall for regular mounts.

This is another interesting use case: [NFS-mount-in-user-namespace]

[NFS-mount-in-user-namespace]: https://github.com/kinvolk/nfs-mount-in-userns

[path_unmountat]: https://github.com/shiziwen/linux/blob/26b0332e30c7f93e780aaa054bd84e3437f84354/fs/namei.c#L2305

## Relative unmount

To leave this in a some what positive note,
we can use a relative `unmount` like this relative mount example from [Linux's test].

[Linux's test]: https://github.com/torvalds/linux/blob/93f5de5f648d2b1ce3540a4ac71756d4a852dc23/tools/testing/selftests/openat2/resolve_test.c#L75
```c
/* There is no mountat(2), so use chdir. */
E_mkdirat(dfd, "mnt", 0755);
E_fchdir(dfd);
E_mount("tmpfs", "./mnt", "tmpfs", MS_NOSUID | MS_NODEV, "");
```

This relative mount technique will carry us to a [workable patch to Buildbarn].
With prototype c-code [available here].

```c
int
main(int argc, char* argv[])
{
    char* mountpoint = "./proc";
    if (argc < 2) {
        exit(1);
    }

    char* initial = argv[1];
    int dfd = openat(AT_FDCWD, initial, 0);
    fchdir(dfd);
    umount(mountpoint);
}
```

With [similar go code here].

[available here]: https://github.com/meroton/prototype-mountat/blob/main/c-prototypes/relative_mount.c
[similar go code here]: https://github.com/meroton/prototype-mountat/blob/cmd/relative-unmount/main.go
[workable patch to Buildbarn]: /docs/improved-chroot-in-Buildbarn/integrating-mountat/

## Request of the audience

Do you know how to use the new mount API to implement `unmountat`?
Do you spot any errors in our investigation, or ideas we forgot?
Please let us know!
