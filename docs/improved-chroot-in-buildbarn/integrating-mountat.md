---
title: V Integrating Mountat in Buildbarn
sidebar_position: 5
---
# Integrating mountat in Buildbarn

:::info

This is a living document describing the path to merging the patches from this work into [Buildbarn].
We will post better patches here as we develop them.

:::

[Buildbarn]: https://github.com/buildbarn/bb-remote-execution/

## Requirements

* Linux 5.2:
  [for the new mount api]

* Super user privileges:
  We want to limit this to just `CAP_MOUNT`.

[for the new mount api]: https://cdn.kernel.org/pub/linux/kernel/v5.x/ChangeLog-5.2

## First hack: use dumb-old 'mount' in the runner

This is the proof-of-concept patch, to demonstrate that these two mounts is the missing piece.
This hacks around the filesystem veil by observing the _command_ object's
chroot attribute,
which is set for the processes metadata before the _runner_ `fork`s and `exec`s the _action_.
This is not something that should be observed and this patch will not be merged.
But we have used it for a while and you can use it too.

https://github.com/buildbarn/bb-remote-execution/issues/115
§ Proof of Concept Patch

This will not be submitted to the code,
but serves as a good demonstration of the problem.

## Second best-effort: use new 'mountat' but hack unmounting through absolute paths

Through [implementing mountat] ([in golang])
we can now mount the special filesystems with `mountat`,
following the provided abstractions.
But the unmounting code [is not implemented]
so we have to use a hack/workaround
that parses the `fstab` for the mounts we created so they can be unmounted.

### Use the mtab as a workaround

With every mount the kernel thankfully registers it in `/etc/mtab`,
and even though our program does not know the absolute paths,
no one fools the kernel.
So with just a little peek behind the *veil*, or with this escape hatch, the *curtain*.
We can unmount our files as well.
This is deemed acceptable for now,
as this inhermiticity is in the exit code path of our programs,
we would not want to escape the abstraction during normal mode of operation.

    1: Parse the fstab for a mountpoint basename
       and a directory path segment,
       that must be unique to find the real mount.
       so the application should preferably create a parent to the filesystem
       with a known name.
       Or, if we can use a known base directory
       but the intermediary directory names are unknown.

    2: Call `umount` on the mountpoint,
       some filesystems are (almost) always busy
       so you may need `MNT_FORCE`.

This is a little bit of a hack, but works well in practice.
The implementation needs more error handling than what is ergonomic in C.
You can read the implementation here: [mountat].
This is written in `go`, just like [Buildbarn].

[mountat]:       https://github.com/meroton/prototype-mountat/blob/main/cmd/mountat/main.go
[mountat.c]:     https://github.com/meroton/prototype-mountat/blob/main/c-prototypes/mountat.c
[mountat_dfd.c]: https://github.com/meroton/prototype-mountat/blob/main/c-prototypes/mountat_dfd.c

We will not pursue adding this to Buildbarn.

[implementing mountat]: /docs/improved-chroot-in-Buildbarn/implementing-mountat/
[in golang]: https://github.com/meroton/prototype-mountat/blob/main/cmd/mountat/main.go#L231
[is not implemented]: /docs/improved-chroot-in-Buildbarn/implementing-unmountat/

## Third attempt: with relative-path unmount

To change the directory with `fchdir` is a noticeable side-effect,
but better than the two previous alternatives.
The most pragmatic solution is to add a semaphore around this code,
to make sure that we return the program's working directory after unmounts.

After submitting the initial PR we found that [Buildbarn already did this].
By creating the semaphore again and getting a "duplicate symbol definition" error from the LSP.
That's how it goes sometimes...

[Buildbarn already did this]: https://github.com/buildbarn/bb-storage/blob/ece87ab6dc2a9e1e592d2032f5a02c3694765cfc/pkg/filesystem/local_directory_unix.go#L271

### Alternative: unmount in a subprocess

One could also take it further with a subprocess,
so the directory change is completely isolated.
The extra overhead is acceptable
as unmounting is not in the _action_'s critical path.

This requires a [separate program] that performs the unmount,
and code in the main program that forks and executes the unmounter.
Bazel has everything we need for that,
the only thing to remember is that the directory file descriptor
must be sent to the child.
We just duplicate it with `unix.Dup` so it is inherited.
This is implemented in the [mountat] program
and we will prepare a pull request so you can try it out in the [Buildbarn] code.

But this would make it much harder to run the program as a standalone program,
as it needs to bring the companion program.
Managing two files is much more inconvenient than a single file.
To solve this one could redesign the program
to itself implement the unmounting code path if launched with special arguments.
This is a useful technique but makes it harder to understand what the program does.

[separate program]: https://github.com/meroton/prototype-mountat/blob/cmd/relative-unmount/main.go

## Desired solution: full mountat semantics with unmountat

This should be possible,
the documentation does indicate that we can do so.
I hope someone can spot my errors, so we find the solution.

But maybe the vagaries of filesystems and mounts
are so that this is not something Linux wants?

# Tips and Tricks from development

## Observe filesystem operations in the docker

You can see what mounts are active (and removed!) inside the docker image.
A new id is generated each time the image starts,
so two commands are needed.
You should see two mounts for each active action,
and no remaining mounts for completed actions.

```
id="$(docker-compose $ docker ps                 \
  | grep docker-compose-runner-fuse-distroless-1 \
  | cut -d ' ' -f1)"
docker-compose $ docker exec -it "$id" bash

root@21dee4887020:/tmp# mount -v | grep /worker/build
bb_worker on /worker/build type fuse.SimpleRawFileSystem (rw,relatime,user_id=0,group_id=0,allow_other)
/proc on /worker/build/f3fb7c74c3b342a0/root/proc type proc (rw,noexec,relatime)
/sys on /worker/build/f3fb7c74c3b342a0/root/sys type sysfs (rw,noexec,relatime)
...
```
