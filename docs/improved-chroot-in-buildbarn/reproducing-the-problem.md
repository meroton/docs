# Reproducing the problem

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

Thankfully it is simple to create a statically linked `go` program

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

## Get yourself an /usr/bin/env for fun and profit

Thankfully `busybox` has easy to use programs, that can help in a pinch,
especially the `musl` versions.

  $ docker run -v .:/out busybox:musl sh -c "cp /usr/bin/env /out/env"
  $ file env
  env: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), statically linked, stripped

Now we just need to put it in the input root as `/usr/bin/env`.

  $ mkdir -p usr/bin
  $ mv env usr/bin/

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
    srcs = ["usr/bin/env"],  # env is required in Buildbarn's process creation.
)
```

## Build remotely

With the customary `docker-compose` setup.

```
bazel build \
    --remote_executor=grpc://localhost:8980 \
    --remote_instance_name=fuse \
    --remote_default_exec_properties OSFamily=linux \
    --remote_default_exec_properties container-image="docker://ghcr.io/catthehacker/ubuntu:act-22.04@sha256:5f9c35c25db1d51a8ddaae5c0ba8d3c163c5e9a4a6cc97acd409ac7eae239448" \
    @//:introspection
```

This works with regular runners,
but not `chroot` runners.

## Apply the patches

A setback! The docker-compose setup does not build the docker images,
so we would have to create deliverables from the pull requests,
which is tedious.
Instead we use the `bare` deployment
where we do compile the `runner` from source.

So we instead build with:

```
bazel build \
  --remote_executor=grpc://localhost:8980 \
  --remote_instance_name="" \
  //:introspection
```

And instead start it through `bazel run`:

```
$ mktemp -d
/tmp/tmp.sjR6aHjhni
$ bazel run --script_path launch-bare //bare
# or bazelisk if you use that, the super user typically does not have bazel on its PATH.
# or --run_under sudo
$ sudo launch-bare /tmp/tmp.sjR6aHjhni
```

:::info

We need `sudo` privileges for creating the special character devices.
Otherwise it fails when creating `/dev/random` in the input root.
We will also need `CAP_SYS_ADMIN` for `mount`

:::

Notice that we no longer use FUSE,
but for our reproduction that is okay.
In production use you [do want FUSE]

[do want FUSE]: /docs/improved-chroot-in-Buildbarn/chroot-in-buildbarn/

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
+        commit = "01729791c366b6d713bf4f5e6c706cb274292539",
     )
+
     go_repository(
         name = "com_github_buildbarn_bb_storage",
         importpath = "github.com/buildbarn/bb-storage",
-        sum = "h1:z9yMGmzNNjhC2KnxYGfP8bPk1/l3jpd3+rb+1YkhQg4=",
-        version = "v0.0.0-20230905110346-c04246b462b6",
+        remote = "https://github.com/stagnation/bb-storage",
+        vcs = "git",
+        # Example for the documentation, check the code for the latest working commit
+        commit = "1754fef5ff3c2b5bdaa0659ba1dfbdb2e4dc73f5",
     )
```

If you want to change the patches it is often easiest to use Bazel's `--override_repository` flag:

```
$ bazel run \
    --script_path launch-bare \
    --override_repository com_github_buildbarn_bb_remote_execution=~/task/patching/bb-remote-execution \
    --override_repository com_github_buildbarn_bb_storage=~/task/patching/bb-storage \
    //bare
```

## Successful build

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

If it is not executed remotely: `bazel clean`.
Unfortunately the `no-cache` does not work.
