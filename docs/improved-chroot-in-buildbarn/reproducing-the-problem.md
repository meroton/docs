---
title: VI Reproducing the Problem
sidebar_position: 6
---
# Reproducing the Problem

This document explains how to reproduce the problem and try the patches
while they are improved and submitted.
Once the pull requests are merged this will not be needed
and will stand just as another interesting technical rabbit hole.

## Problem statement and preliminaries

The problem statement is simple:
programs that use `/proc` cannot run in `chroot`.
It should be easy to create a reproduction.

However, there are not publicly available programs that create a user-space input root.
This is something that _middleware_ could do,
but requires a lot of code.

What options do we have?
Use the `go`-compiler, a `bash` script to call `ls /proc/self`, or compile a statically linked binary to do the same.
The [rules_go] toolchain builds a hermetic go compiler and sends that in the input root,
so it is a good candidate.
However it uses the system `gcc` to compile it.
And we get errors that `gcc` is not available.
An interpreted program like `bash` does not work either,
as we do not have the interpreter available.

Thankfully it is simple to create a statically linked `go` program.

```
go_binary(
    ...
    pure = "on",
)
```

And we can use the eminent [run_binary] rule,
which does not require `bash` to execute a tool.
We use the compiled program directly as a source in the `tool` attribute.
If we were to use `native_binary` we get snagged up by a `bash` dependency
in its `CopyFile` action.

But with this we fail, here is the output from `bb-browser`:

```
  Command^*

        Arguments:       ./ls-proc bazel-out/k8-fastbuild/bin/out
  Environment variables: PATH=/bin:/usr/bin:/usr/local/bin

  Result

  Status: Code 3: Failed to run command: Failed to start process: fork
          /exec /usr/bin/env: no such file or directory
```

This is because `Buildbarn` itself wraps the process with `/usr/bin/env`.
[Here] `env` is used for PATH resolution before `chroot`.

[Here]: https://github.com/buildbarn/bb-remote-execution/blob/master/pkg/runner/local_runner_unix.go#L110
[run_binary]: https://docs.aspect.build/rules/aspect_bazel_lib/docs/run_binary/
[rules_go]: https://github.com/bazelbuild/rules_go/issues/1708

## Build yourself an /usr/bin/env for fun and profit

Thankfully `busybox` has easy to use programs, that can help in a pinch,
especially the `musl` versions.

```
$ docker run -v .:/out busybox:musl sh -c "cp /usr/bin/env /out/env"
$ file env
env: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), statically linked, stripped
```

Now we just need to put it in the input root as `/usr/bin/env`.

```
$ mkdir -p usr/bin
$ mv env usr/bin/
```

With the "introspection" target

```
run_binary(
    name = "introspection",
    outs = ["out"],
    args = ["$(location out)"],
    execution_requirements = {
        "no-cache": "1",
    },
    tool = ":ls-proc",
    srcs = [
        # env is required in path resolution for chroot actions.
        "usr/bin/env",
        # Not strictly needed, but symmetric with sys and proc.
        "dev/dummy",
        # Send a directory for /sys and /proc
        # Bazel wants a file for it to send the directory.
        "sys/dummy",
        "proc/dummy",
    ],
)
```

This `introspection` target is [available to cherry-pick] for `bb-deployments`
where I bootstrap and test the functionality in `bb-remote-execution`.
See [this branch] for more.

[available to cherry-pick]: https://github.com/stagnation/bb-deployments/commit/4bd72af1b75c3e75acdcd612396b352d1188e186
[this branch]: https://github.com/stagnation/bb-deployments/commits/feature/reproduce-bb-remote-execution-115/

## Build remotely

With the customary `docker-compose` setup.

```
$ bazel build \
    --remote_executor=grpc://localhost:8980 \
    --remote_instance_name=fuse \
    --remote_default_exec_properties OSFamily=linux \
    --remote_default_exec_properties container-image="docker://ghcr.io/catthehacker/ubuntu:act-22.04@sha256:5f9c35c25db1d51a8ddaae5c0ba8d3c163c5e9a4a6cc97acd409ac7eae239448" \
    @//:introspection
Action details (uncached result): http://localhost:7984/fuse/blobs/sha256/historical_execute_response/598e3f5ad5548d7cbae6cb7918b0ce02c4dee92db0b8b11ab01835d9090ed33d-884/
2024/03/26 15:14:24 Reading /proc/self:open /proc/self: no such file or directory
Target //:introspection failed to build
```

This works with regular runners,
but not `chroot` runners.

## Apply the patches

A setback! The docker-compose setup does not build the docker images,
so we would have to create deliverables from the pull requests,
which is tedious.
Instead we use the `bare` deployment
where we do compile the `runner` from source.

### The pull requests are applied through the go_dependencies

```
     go_repository(
         name = "com_github_buildbarn_bb_remote_execution",
         importpath = "github.com/buildbarn/bb-remote-execution",
-        sum = "h1:BKoGfhCfn5IA4JRLMB7I4yHsM06fLvOc/zwzSxEuNrY=",
-        version = "v0.0.0-20230905173453-70efb72857b0",
+        remote = "https://github.com/stagnation/bb-remote-execution",
+        vcs = "git",
+        # Example for the documentation, check the code for the latest working commit
+        commit = "2dfbdb8e3ac9675c70134bea97f4fb7b18c0de35",
     )
```

```
$ bazel run \
    --script_path launch-bare \
    //bare
```

and launch:

```
$ mktemp -d
/tmp/tmp.sjR6aHjhni
$ sudo launch-bare /tmp/tmp.sjR6aHjhni
```

:::info

We need sudo privileges for creating the special character devices.
Otherwise it fails when creating `/dev/random` in the input root.
We will also need `CAP_SYS_ADMIN` for `mount`

:::

Notice that we no longer use FUSE,
but for our reproduction that is okay.
In production use you [do want FUSE].

[do want FUSE]: /docs/improved-chroot-in-Buildbarn/chroot-in-buildbarn/

### You can also use a local checkout and override the repository

If you want to change the patches it is often easiest to use Bazel's
`--override_repository` flag.
Just rebuild it with this command line
and the `go_module` does not matter.

```
$ bazel run \
    --script_path launch-bare \
    --override_repository com_github_buildbarn_bb_remote_execution=~/task/patching/bb-remote-execution \
    //bare
```

## Run the reproduction with the bare deployment

We now build with the simpler bazel command:

```
$ bazel build \
  --remote_executor=grpc://localhost:8980 \
  --remote_instance_name="" \
  //:introspection
```

Notice that we no longer use FUSE,
but for our reproduction that is okay.
In production use you [do want FUSE]

[do want FUSE]: /docs/improved-chroot-in-Buildbarn/chroot-in-buildbarn/

### Successful build

This is the expected output:

```
INFO: From RunBinary out:
arch_status
attr
autogroup
auxv
cgroup
clear_refs
cmdline
comm
coredump_filter
cpu_resctrl_groups
cpuset
Target //:introspection up-to-date:
  bazel-bin/out
INFO: Elapsed time: 0.306s, Critical Path: 0.03s
INFO: 2 processes: 1 internal, 1 remote.
INFO: Build completed successfully, 2 total actions
```

If it is not executed remotely run `bazel clean`.
Unfortunately the `no-cache` tag does not work here.
