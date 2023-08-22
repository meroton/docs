---
title: III Implementing Mountat
sidebar_position: 3
---

# Create "mountat" with the new Linux mount API

"Mountat" is not a syscall, historically you need absolute filepaths to create mounts,
but with the new mount API we can create a function that mount on relative paths.
This is the name we want for a syscall
that mounts to a file descriptor,
customarily `<operation>at`.
This document describes how we implement "mountat".

Why do we want to use file descriptors?
Why do we not use the regular `mount` and just give it an absolute filepath,
like regular folks.
Why are we fancy?

This comes from our work with `chroot`ing build executors in [Buildbarn],
where a strict data structure control file operations.
This does not export absolute filepaths for the file and directory objects,
only relative paths to known root-objects are constructed.
So the code guarantees that artifacts are created in the expected locations.
This has many benefits in controlling execution flow,
it seamlessly allows the code to use in-memory files instead of touching a filesystem at all
and implement usage quotas and other goodies.

For the purpose of mounting a filesystem,
this abstraction has *veiled* the filesystem,
so we would like to operate on a directory file descriptor.
This can be done [by combining `mount` with `fchdir`],
but a full "mountat" is also possible.
This is also what the [lxc project does].

[by combining `mount` with `fchdir`]: https://github.com/meroton/prototype-mountat/blob/main/c-prototypes/relative_mount.c
[lxc project does]: https://github.com/lxc/lxc/blob/main/src/lxc/mount_utils.c#L613

This post will go through how we can implement `mountat`
and later posts in the series will discuss unmounting
and integration with Buildbarn.

[Buildbarn]: https://github.com/buildbarn/bb-remote-execution

## The new mount API

Recent Linux work from David Howells at Redhat introduced several new syscalls, which form "new mount API",
this is primarily used to speed up work with namespaces and moving mounts back and forth.
To break up the monolithic `mount` call into smaller pieces.
The benefit (for us) is that it allows relative paths.
Below are two example programs that can be used to mount at a relative path,
or at a directory file descriptor, which is more convenient for some applications.

> Six (or seven) new system calls for filesystem mounting
> https://lwn.net/Articles/759499/

Note that this is not the final API but describes the background well.
The `write` call will not be used at all.
Later patch sets and the manpages explain the API better,
but some vagaries remain as [we will see later].

> Add manpage for fsopen(2), fspick(2) and fsmount(2)
> https://lwn.net/Articles/802096/

> [MANPAGE PATCH] Add manpages for move_mount(2) and open_tree(2)
> https://lore.kernel.org/linux-man/15488.1531263249@warthog.procyon.org.uk/t/

Unfortunately I have not found the official man pages anywhere.
So the risk of this article being out-of-date is looming.
Just as the announcement gave examples with `write` that does not work with the real code.
This is the [general documentation for the API] but does not cover our use-cases.

[general documentation for the API]: https://www.kernel.org/doc/Documentation/filesystems/mount_api.txt

## Mount inside a directory file descriptor

This creates a named mountpoint in a directory anywhere on the filesystem.
This uses a file descriptor for the directory internally,
this is the API we will [integrate with Buildbarn].
We get the `at` behavior from `openat` here, relative filepaths work just fine.
`assets/mountat_dfd.c`

```c
/* Overview of how to implement `mountat` with the new mount API.
 * This does not show proper error handling.
 * It also omits the function wrappers around the syscalls,
 * they can be found in the full code listing.
 */

void
mountat(int dfd, const char *fstype, const char *source, const char *name)
{
    int fd = fsopen(fstype, FSOPEN_CLOEXEC);
    fsconfig(fd, FSCONFIG_SET_STRING, "source", source, 0);
    fsconfig(fd, FSCONFIG_CMD_CREATE, NULL, NULL, 0);
    int mfd = fsmount(fd, FSMOUNT_CLOEXEC, MS_NOEXEC);
    move_mount(mfd, "", dfd, name, MOVE_MOUNT_F_EMPTY_PATH);
}

int
main(int argc, char* argv[])
{
    if (argc < 2) {
        printf("Usage: %s <directory>\n", argv[0]);
        exit(1);
    }

    char* dir = argv[1];
    int dfd = openat(AT_FDCWD, dir, 0);
    mountat(dfd, "proc", "/proc", "proc");
    mountat(dfd, "sysfs", "/sys", "sys");
}
```

Full code is available at [mountat_dfd.c].
The code can be run as follows,
note the `strace` output of the syscalls
and how file descriptors pass between the functions.
The astute reader knows that we can _golf_ away the `openat`
if we want to create the mounts directly inside the working directory.

```
$ mkdir -p /tmp/test-relative-mount-at2/{sys,proc}
$ gcc mountat_dfd.c
$ sudo strace -s1000 -f -o trace ./a.out /tmp/test-relative-mount-at2/
$ grep -e openat -e fsopen -e fsconfig -e fsmount -e move_mount trace
877364 openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
877364 openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
877364 openat(AT_FDCWD, "/tmp/test-relative-mount-at2/", O_RDONLY) = 3
877364 fsopen("proc", FSOPEN_CLOEXEC)   = 4
877364 fsconfig(4, FSCONFIG_SET_STRING, "source", "/proc", 0) = 0
877364 fsconfig(4, FSCONFIG_CMD_CREATE, NULL, NULL, 0) = 0
877364 fsmount(4, FSMOUNT_CLOEXEC, MOUNT_ATTR_NOEXEC) = 5
877364 move_mount(5, "", 3, "proc", MOVE_MOUNT_F_EMPTY_PATH) = 0
877364 fsopen("sysfs", FSOPEN_CLOEXEC)  = 6
877364 fsconfig(6, FSCONFIG_SET_STRING, "source", "/sys", 0) = 0
877364 fsconfig(6, FSCONFIG_CMD_CREATE, NULL, NULL, 0) = 0
877364 fsmount(6, FSMOUNT_CLOEXEC, MOUNT_ATTR_NOEXEC) = 7
877364 move_mount(7, "", 3, "sys", MOVE_MOUNT_F_EMPTY_PATH) = 0
```

See the [prototype Readme] for more information about running these programs.

[prototype Readme]: https://github.com/meroton/prototype-mountat/blob/main/README.rst

## How do we unmount?

Unfortunately the "new mount API" does not provide a clear way to unmount from relative paths.
We would like to pair this with `umountat`.

Quote the manpages:

    move_mount () is called repeatedly with a file descriptor that refers to a mount object,
    then the object will be attached/moved the first time and then moved again and
    again and again, detaching it from the previous mountpoint each time.

But this was not enough for us to implement `umountat`.
Thankfully we can make do without it.

## Background on syscalls and c library wrappers

All the prototype code have special wrapper functions for the syscalls,
that specify the syscall number and pass arguments.
This is typically done by `glibc` and not needed in program code,
however, these new syscalls are not available in older versions,
(they were introduced to `glibc` in [version 2.36]).

In the go code this typically lives in the `unix` package,
and the `glibc` is not used when building statically linked binaries.
The majority of the syscalls in the new mount API are merged,
but `fsconfig` is [not merged yet], so a simple implementation is provided just for the code we exercise,
as that is more complex than most syscalls.

[version 2.36]: https://www.phoronix.com/news/GNU-C-Library-Glibc-2.36
[not merged yet]: https://go-review.googlesource.com/c/sys/+/399995/
