---
title: I Chroot in Buildbarn
sidebar_position: 1
---
# Chroot in Buildbarn

Buildbarn workers and runners have functionality to chroot into the input root,
this is valuable if the [REAPI] _action_  _input root_ contains all the required tools,
the action will then be completely isolated from the host machine.

Buildbarn's remote build engine, RBE, is split in two programs,
the _worker_ and the _runner_.
The _worker_ is responsible for communicating with the _scheduler_
and by extension the build client (`bazel`, `buck2`, ...).
It accepts an _action_ to perform,
downloads the necessary files (if they are not already cached locally),
prepares the action in its own sandbox directory
and tells the _runner_ to execute it.
This allows for more process isolation and better security controls.
The _runner_ is simple and executes _commands_ on input files fed by the _worker_.

[REAPI]: https://github.com/bazelbuild/remote-apis

## Configuration

To enable `chroot` you just need a couple of settings,
first enable `chroot`,
then [create the special character devices] in the action root.
The well-known family of `/dev/null`, `/dev/random`, and so on.
They are not technically _mounted_, but created through `mknodat`.

Runner.jsonnet [runner proto documentation]:
[runner proto documentation]: https://github.com/buildbarn/bb-remote-execution/blob/96c4fdce659fabfaba7ee2a60fd4e2ffab8352e2/pkg/proto/configuration/bb_runner/bb_runner.proto#L39
```js
{
  chrootIntoInputRoot: true,
  ...
}
```

Worker.jsonnet [worker proto documentation]:
[worker proto documentation]: https://github.com/buildbarn/bb-remote-execution/blob/96c4fdce659fabfaba7ee2a60fd4e2ffab8352e2/pkg/proto/configuration/bb_worker/bb_worker.proto#L258
```js
{
  ...
  buildDirectories: [
    {
      runners: [
        {
        ...
          inputRootCharacterDeviceNodes: [
            "full",
            "null",
            "random",
            "tty",
            "urandom",
            "zero"
          ],
        }
      ] // runners
    }
  ] // build directories
}
```

### Fuse workers

If your action roots have many files,
you do not want to use the hardlinking workers.
Especially if many of the tool files are never read,
it is better to use `fuse` workers.
There the input root is prepared in a `fuse` or `NFSv4` filesystem
and downloaded lazily.

Fuse setup is trickier, thankfully we have [already demonstrated it in bb-deployments].
It is important to set up the `docker` `bind` mounts correctly,
so the _worker_ and _runner_ can communicate.
Without this, the _worker_ fails to setup the input root
and fallback code in the `fuse` layers tries to launch programs that do not exist.

<!-- TODO: add error messages here -->

[already demonstrated it in bb-deployments]: https://github.com/buildbarn/bb-deployments/blob/d142377ce90d48407f01ca67a7707d958de38936/docker-compose/docker-compose.yml#L68

The _worker_ needs privileges for setting up the `fuse` filesystem and preparing the `chroot`.
```yaml
services:
  worker-fuse:
  ...
    privileged: true
    volumes:
      - ../.mounts/apps/worker-fuse:/app:ro
      - type: bind
        source: ../.mounts/data/worker-fuse
        target: /worker
        bind:
          # Bidirectional mount to expose the FUSE mount.
          propagation: shared

  runner-fuse:
    ...
    privileged: false
    volumes:
      - ../.mounts/apps/runner:/app:ro
      - type: bind
        source: ../.mounts/data/worker-fuse
        target: /worker
        bind:
          # HostToContainer mount to use the FUSE mount.
          propagation: slave
```
[create the special character devices]: https://github.com/buildbarn/bb-remote-execution/blob/96c4fdce659fabfaba7ee2a60fd4e2ffab8352e2/pkg/builder/local_build_executor.go#L185
