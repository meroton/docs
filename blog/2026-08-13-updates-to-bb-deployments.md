---
slug: bb-deployments-updates-2026-06
title: Updates to Buildbarn deployment repo as of June 2026
authors: oscar
tags: [release, buildbarn]
---

# Updates to Buildbarn deployment repo as of June 2026

The example configuration for [bb-deployments](https://github.com/buildbarn/bb-deployments/) has been updated.

This post will give an overview of what has happened since the last
[update summary](/blog/buildbarn-updates-2023-11/) in November 2023, and will
cover important changes since then up to 2026-06-12.

Additional Buildbarn changes can be found in the [bb-deployments changelog](https://github.com/buildbarn/bb-deployments/blob/91a3580fe366978e752eef907cdb9030de7d6553/changelog.md).

## Major changes

### Upgrade to Bazel 9

The Buildbarn components have been upgraded to use Bazel 9.

### [Remove `tini` (Jan 29, 2026)](https://github.com/buildbarn/bb-storage/commit/d2a3a16763ee8a62125d9c57b7a12bf5d9ae0789)

Buildbarn binaries will now relaunch themselves in a child process, if the PID is 1.
This removes the need to run bb_runner through `tini` because zombie processes in containers
are no longer an issue.

### [Generic gRPC stream forwarding (Jan 19, 2026)](https://github.com/buildbarn/bb-storage/commit/5b5db75d620841b08c02f04f817652d4ebc949ce)

The gRPC servers can now forward incoming streams of specified
services. This enables passing Bazel's build event stream
to the same DNS name, without having to add an extra L7
router in front of the bb_storage frontend.

```jsonnet
grpcServers: [{
  ...
  relays: [
    {
      endpoint: {
        address: 'localhost:1234',
      },
      services: [
        'build.bazel.remote.execution.v2.Execution',
        'com.google.devtools.build.v1.PublishBuildEvent',
      ],
    },
  ],
}],
```

### [OAuth Client credentials for HTTP clients (Sep 26, 2025)](https://github.com/buildbarn/bb-storage/commit/a3f0c77a996f0801a875a604c22608d94f06c910)

Buildbarn's HTTP client now supports OAuth Client Credential flow.

### [WinFSP virtual file system implementation (Aug 20, 2025)](https://github.com/buildbarn/bb-remote-execution/commit/efef252cdf4f97cc0154ea02976ed1322587e599)

An implementation of WinFSP VFS has been added, enabling bb_worker to
succesfully execute Bazel builds with virtualised file inputs on Windows.
See the commit message for more details.

### [Allow files to be read by JMESPath Expressions (Aug 11, 2025)](https://github.com/buildbarn/bb-storage/commit/a73d96059b0f211267391994ddf391c29c0d5b4e)

Buildbarn has expanded the configuration of JMESPath expressions.
Instead of only specifying a string, an optional set of files
can be included, whose contents will be available for the
expression using the `files` field. The contents of the file
refreshes every 60 seconds. The struct also includes
optional test vectors, each test consisting of an input
and expected output. The program fails to start if the
expression does not produce the expected output from the input.

```jsonnet
addMetadataJmespathExpression: {
  expression: |||
    {
      "authorization": [std.format('bearer %s', files.token)]
    }
  |||,
  files: [
    {
      key: "token",
      path: "/tokens/buildbarn",
    },
  ],
},
```

### ZSTD compression

Support has been added for [in-transit ZSTD compression in the gRPC ByteStream layer](https://github.com/buildbarn/bb-storage/commit/da77bb647e8fd10666c3da6e8d3133e4bdba2a30) (Jul 15, 2025),
used by the CAS. This feature is a pre-requisite for supporting compressed
bb_clientd. [A pool of decoders and encoders can be configured with an optional
upper bound of instances](https://github.com/buildbarn/bb-storage/commit/f48c18e95728c9274d06d52d9c41120fd9e34b48) (Mar 12, 2026).
See [this commit for the gRPC client side configuration](https://github.com/buildbarn/bb-storage/commit/f62d21c785f14e47af523673ed2827206b3d5161) (Mar 2, 2026).

### [Sharding algorithm changes (Apr 8, 2025)](https://github.com/buildbarn/bb-storage/commit/67b6c608a9d8c6988625f846e545eb3803eb302b)

The previous sharding algorithm has been replaced with Rendezvous hashing,
making resharding less disruptive. This change is not backwards compatible.
See [Buildbarn ADR #11](https://github.com/buildbarn/bb-adrs/blob/bf2066633e1712a3ef7c295d37cd52e65867391d/0011-rendezvous-hashing.md) for more details.

### [Remote authentication and authorization (Feb 20, 2025)](https://github.com/buildbarn/bb-storage/commit/214cfae17630f655e9b26582f5361fa3ca102e06)

HTTP and gRPC servers can now forward authentication and authorization
requests to a remote service. The results are cached for a short while to
reduce the load on the remote service.

### NFSv4 changes

[NFSv4.1 for bb_worker is now supported](https://github.com/buildbarn/bb-remote-execution/commit/3a086e580afeae34a9c62bfa8b06dc88f2d79a03) (Jul 9, 2024)
in addition to NFSv4.0. The versions have some substantial protocol
differences, as described in the commit message.

NFSv4 has been extended to support named attributes, see the related [PR](https://github.com/buildbarn/bb-remote-execution/pull/195) (Oct 5, 2025)
for more details.

### [Permit predeclaring multiple size class queues (Jun 4, 2024)](https://github.com/buildbarn/bb-remote-execution/commit/f5844bece897ac411d7b83928dd0914414437136)

Predeclared platform queue size classes are now defined by
an array of size classes, previously configured by setting
the maximum size class. This allows all workers for all
sizes to be autoscaled down to zero. When using multiple
size classes, the lowest cannot be zero.

```jsonnet
{
  ...
  predeclaredPlatformQueues: [
    {
      instanceNamePrefix: 'testingQueue',
      sizeClasses: [1, 2, 3, 4, 5, 6, 7],
    },
    {
      sizeClasses: [1, 2, 3, 4, 5, 6, 7],
    },
  ],
  ...
}

// If the user does not care about multiple size classes:
{
  ...
  predeclaredPlatformQueues: [
    {
      sizeClasses: [0],
    },
  ],
}
```

### macOS mount configuration changes

[The support for FUSE mounts on macOS has been removed](https://github.com/buildbarn/bb-remote-execution/commit/9791c09e5e223bae00477438dd05d1d816835e8c) (Mar 3, 2024)
due to OSXFUSE/macFUSE being unstable. macOS users are
recommended to instead use NFSv4. However the [NFSv4
support for macOS 14 and older has been dropped](https://github.com/buildbarn/bb-remote-execution/commit/6dae65a07e942429e4bcb8f17924ec90ccada3ca) (May 7, 2026)
as macOS 15 has been out for some time.

### [Add support for uploading output directories as Directory messages (Dec 22, 2023)](https://github.com/buildbarn/bb-remote-execution/commit/f9ea0294c9a36683d06aef1840ba39c2eaccfb68)

[REv2 has added the ability to upload output directories as multiple Directory messages](https://github.com/bazelbuild/remote-apis/pull/258)
instead of a single Tree object, if requested by the client. bb_worker has added support for this feature,
and can also force upload Directory messages to the CAS in addition to uploading the Tree object by setting

```jsonnet
forceUploadTreesAndDirectories: true;
```

in the worker configuration. Forcefully uploading Directory messages has several advantages
as documented in the [worker Proto file](https://github.com/buildbarn/bb-remote-execution/blob/f9ea0294c9a36683d06aef1840ba39c2eaccfb68/pkg/proto/configuration/bb_worker/bb_worker.proto#L146):

> * bb_browser is capable of displaying listings of individual
> directories contained in an output directory without needing to
> load the full Tree object from the CAS.
>
> * Root directories of output directories created through
> bb_clientd's Bazel Output Service feature load slightly faster,
> as they can be validated without processing full Tree objects.
>
> * Even for clients that only support output directories in the form
> of Tree messages, having Directory messages present means that
> subsequent build actions need to upload fewer objects.
>
> The disadvantage of enabling this option is that a larger number of
> objects are written into the CAS.

## Minor changes

### Extended digest algorithm support

The list of supported digest algorithms has been extended with
[blake3](https://github.com/buildbarn/bb-storage/commit/14e58f4631ad20fff197b2f4a8e36a6cdca92379) (Dec 31, 2025)
and [GITSHA1](https://github.com/buildbarn/bb-storage/commit/797be97c5d2c216dafb4c4345e24003952c71561) (Jan 27, 2026)

### [Remote Action Router (Dec 8, 2025)](https://github.com/buildbarn/bb-remote-execution/commit/babfe8f73772adb40306ee23546d3f827d120998)

This allows the scheduler to delegate action routing decisions to
a remote gRPC service.

### [gRPC server ALTS Authentication (Nov 7, 2025)](https://github.com/buildbarn/bb-storage/commit/7ca8e392c0fb11182f44af9ffe87a255f17f6c6a)

The gRPC server component now supports basic ATLS authentication.

### Additional OIDC support

[The authenticator has been extended to support PKCE](https://github.com/buildbarn/bb-storage/commit/3c0eb5f6f1bae8f0af2cdc66e67ce43eaaa82ebd) (Oct 31, 2025), and [user
information claims can now be extracted from an ID token](https://github.com/buildbarn/bb-storage/commit/2dbef2a29c2d06b4711e07fe8cf020b2caf4f088) (May 28, 2025) instead
of the user info endpoint.

### [Add support for execution timeout compensation via HTTP (Oct 31, 2025)](https://github.com/buildbarn/bb-remote-execution/commit/44156572da4cef72713cfcc2f1a80f3979ae427c)

A configuration option has been added which allows bb_worker
to control of the execution timeout timer via HTTP. It is configured by specifying two URLs
which are polled by the worker: a "suspend URL", whose response
controls whether the timeout timer is suspended, and a "resume URL"
whose response controls whether to resume the timer.
This feature is useful for when the worker timeout needs to be
compensated for file downloads from outside the input root.

### [`cron` job for saving JWKSes to Kubernetes ConfigMap (Aug 19, 2025)](https://github.com/buildbarn/bb-storage/commit/61b785bec9abada72706b55deaebd1746dfb0c11)

Buildbarn now includes simple program which saves JWKSes in a Kubernetes ConfigMap,
which can then be made available to Buildbarn with a volume mount.
The program is meant to be run periodically in the cluster.

### [Synchronize request authorization (Jul 27, 2025)](https://github.com/buildbarn/bb-remote-execution/commit/58b88e8adfbd4cb5c32905383ef9c35ea1f9598e)

The scheduler can now be configured with an additional authorizer, to authorize
bb_worker synchronize requests.

### [Add the ability to set owner user/group IDs on directories (Jun 11, 2025)](https://github.com/buildbarn/bb-remote-execution/commit/81753944a0d407a8f053bc65edf97cdfc6051831)

VFS and FUSE backends now support setting directory ownership.
This is useful for when running repo rules as remote actions, as
[Bonanza](https://github.com/buildbarn/bonanza) will, many of which
depend on having ownership.

### [Deadline enforcing blob access (Feb 17, 2025)](https://github.com/buildbarn/bb-storage/commit/c93a48efa9286ed246c1a40d586cfa9e7fd847cb)

A decorator, `DeadlineEnforcingBlobAccess`, has been added which sets a
configurable timeout duration. This sets an upper limit on the durations
for bb_storage's incoming RPCs. For example, this is useful for reject writes
that are taking an excessive amouint of time to complete.

### [Enable custom gRPC connection load balancing method (Jan 23, 2025)](https://github.com/buildbarn/bb-storage/commit/7ebb551ce5caf414481a48dad248e79f29a48719)

The default gRPC connection load balancing policy
is now configurable. This enables using the round-robin strategy.
See [gRPC service configuration](https://grpc.io/docs/guides/service-config/)
for more information.

### [Double the number of recommended KeyLocationMap attempts (Sep 10, 2024)](https://github.com/buildbarn/bb-storage/commit/45c576372791567ba0111ce79f4cfa1c0ec961ad)

The recommended values from `keyLocationMapMaximumGetAttempts` and `keyLocationMapMaximumPutAttempts`
have been doubled. For more information about the Key Location Map,
see our [blog post](/blog/understanding-the-klm/) about the topic.

### [HTTP server TLS support (Jun 12, 2024)](https://github.com/buildbarn/bb-storage/commit/118cb9ca2a7df1cbac6d51c7f1cc3156cae06446)

The HTTP server configuration now supports an optional TLS configuration.
This is useful when running Buildbarn without an ingress controller,
for example in a bare metal environment.

### [Allow TLS certificate authenticator to validate URI SANs (Apr 10, 2024)](https://github.com/buildbarn/bb-storage/commit/a9d0937955fc44f23434b450608c9ebc8405ab05)

URI subject alternatives names can now be matched with JMESPath expressions
when validating TLS certificates.

### [Custom Kubernetes service endpoint connections (Feb 27, 2024)](https://github.com/buildbarn/bb-storage/commit/a4267fc3c5c3a916004c5021fb13bc2bcf214e05)

Custom Kubernetes resolvers can be configured in the
global configuration. The URL schema and Kubernetes API
server is specified, whose endpoints are expanded and registered.
This is useful in a bare-metal cluster with Buildbarn pods
using the host network, where it can be difficult to establish
network connections between components.

### [Delay file uploads until output files are closed (Feb 22, 2024)](https://github.com/buildbarn/bb-remote-execution/commit/aee4508a844d890d51d905e7b331642ea57d004d)

Before uploading the output files, bb_worker will now wait for them to be closed,
with a user-specified upper bound for the waiting duration.
This prevents cases where the output files are still open for
writing when they are uploaded, due to the kernel closing files asynchronously.

### [Add support for capturing server logs (Jan 26, 2024)](https://github.com/buildbarn/bb-remote-execution/commit/fe4cf5d42613d9b44be4ef969353fb1212222c73)

Every action now gets its own "server_logs" directory, created by
bb_worker. bb_runner doesn't do anything with the directory,
but a custom runner can for example use the directory to store core dumps
of failed actions, which bb_worker will then include in the upload.
For more information on how to configure the directory, see the
[commit message](https://github.com/buildbarn/bb-remote-execution/commit/fe4cf5d42613d9b44be4ef969353fb1212222c73).

### [Add option to set resource limits on startup (Jan 8, 2024)](https://github.com/buildbarn/bb-storage/commit/1ba9ed4c9a744ba1bb168b495256deee7e5f2b59)

A global option has been added which calls `setrlimit(2)` with the
configured values as arguments. The keys in the configuration correspond
to the `RLIMIT_*` suffixes in the `setrlimit` resource parameter.

```jsonnet
global: {
  ...
  setResourceLimits: {
    "NOFILE": {
      softLimit: 1024,
      hardLimit: 4096,
    },
    "CPU": {
      softLimit: 2,
      hardLimit: 4,
    },
  },
  ...
}
```

This feature was introduced because a [new version of Go changed the logic
for setting `RLIMIT_NOFILE` as part of child processes](https://go-review.googlesource.com/c/go/+/476097),
risking build actions to run into file descriptor limits. This change can help avoid
this by overriding the resource limits.

### [`ReferenceExpandingBlobAccess` CAS reference support (Dec 5, 2023)](https://github.com/buildbarn/bb-storage/commit/96218aed2b054770a0429382bd8424a2c98e5dee)

`ReferenceExpandingBlobAccess` has been extended to support request forwarding to a REv2 CAS.
This is useful when designing asset storage services that provide direct exposition over `bytestream://`.

### Additional JWT support

[JWKs can now optionally be read from a file](https://github.com/buildbarn/bb-storage/commit/519a8946d90da3826a65e592ba20715ef7be6466) (Oct 30, 2023), rather
than than providing it inline in the configuration.

JWTs can now be [signed with the Ed25519 algorithm](https://github.com/buildbarn/bb-storage/commit/4d8e1ea58798cd2106ee9bf99ec0f8e9465250ba) (Jun 19, 2024),
and [JWTs signed with RSA-PSS signatures can be validated](https://github.com/buildbarn/bb-storage/commit/e5d91cab6de691aa13e549440545fc6f79e87025) (May 7, 2026).
