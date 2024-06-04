---
title: II The Problem with Special Mounts
sidebar_position: 2
---

# The problem with special mounts

The [`fuse` and `chroot` setup]
works well for many tools, but not all.

Some tools rely on the `/proc` filesystem to operate.
The best example is `cargo` and `rustc` that fails with the following message:

    Thread 'main' panicked at 'failed to get current_exe:
    no /proc/self/exe available. Is /proc mounted?

The goal of this series is to [solve this],
so you never have to worry about the problem stated here.

There are also problems with `go`, `node`, `javac` that have been observed in the [bb-deployments] repo.
Just like `rustc`, the `go` compiler tries to find itself through `/proc/self/exe`
and find the `GOROOT` based on that path.
We have used [bb-deployments] as the development repo
when diagnosing this problem and developing patches,
it can be built successfully when the filesystems are mounted.

[solve this]: /docs/improved-chroot-in-buildbarn/implementing-mountat/
[`fuse` and `chroot` setup]: /docs/improved-chroot-in-buildbarn/chroot-in-buildbarn/

## Mounting the special filesystems in the worker?

The _action_ is prepared in the _worker_,
the core is the [local build executor] where [Execute] executes an _action_.
It creates sandbox directory with all the input files,
through a virtual directory abstraction,
so the files can be loaded lazily through `fuse`.
The _worker_ also [creates the special character devices].
These are needed for `chroot` actions can use `/dev/null`, `/dev/full` et cetera.

Though `chroot` configuration is done in the _runner_,
which prepares and executes the _action_ process described by the _worker_.
This indicates that we should keep the configuration of the filesystems in the _runner_.
Combined with the _worker_'s virtual filesystem,
where the directories can be purely virtual
we have nothing to pin mounts on in the _worker_.

## Mounting the special filesystems in the runner

We want to mount the filesystems in the _runner_
which has a [local `Directory`],
just with the limitation that we should not use filepaths.
We want to use the `at`-family of syscalls.
This is not technically a requirement,
as we can construct absolute file paths here,
but we value compartmentalization that the `at`-syscalls give us.
We know that code for one action can not address paths outside its input root.

## The search for "mountat"

This led to a search for the missing "mountat" syscall,
which can be [implemented with the new Linux mount API],
and a lot of consternation in [trying to implement unmountat] with the same API.

The path to better mounting in `bb-remote-execution` is [tracked here].
This series aims to document the details and a solution.
Patches that you can apply are [listed here],
as well as discussion about merging them into `Buildbarn`.

Note that the special character devices that are already in use are not actually mounted,
and can be created in the virtual layer.
Which is why they are not handled in the _runner_,
and the `chroot` configuration is split between the worker and the runner,

[Execute]: https://github.com/buildbarn/bb-remote-execution/blob/96c4fdce659fabfaba7ee2a60fd4e2ffab8352e2/pkg/builder/local_build_executor.go#L111
[bb-deployments]: https://github.com/buildbarn/bb-deployments/
[creates the special character devices]: https://github.com/buildbarn/bb-remote-execution/blob/96c4fdce659fabfaba7ee2a60fd4e2ffab8352e2/pkg/builder/local_build_executor.go#L185
[implemented with the new Linux mount API]: /docs/improved-chroot-in-buildbarn/implementing-mountat/
[listed here]: /docs/improved-chroot-in-buildbarn/integrating-mountat/
[local `Directory`]: https://github.com/buildbarn/bb-storage/blob/master/pkg/filesystem/directory.go
[local build executor]: https://github.com/buildbarn/bb-remote-execution/blob/96c4fdce659fabfaba7ee2a60fd4e2ffab8352e2/pkg/builder/local_build_executor.go
[this series]: /docs/improved-chroot-in-buildbarn/implementing-mountat/
[tracked here]: https://github.com/buildbarn/bb-remote-execution/issues/115
[trying to implement unmountat]: /docs/improved-chroot-in-buildbarn/implementing-unmountat/
