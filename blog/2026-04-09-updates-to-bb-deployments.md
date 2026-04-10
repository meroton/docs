---
slug: bb-deployments-updates-2026-04
title: Updates to Buildbarn deployment repo as of March 2026
authors: oscar
tags: [release, buildbarn]
---

The example configuration for [bb-deployments](https://github.com/buildbarn/bb-deployments/) has been updated.

<!-- ## Summary -->

<!-- * ZStandard encoder/decoder for blob access -->
<!-- * Get rid of `tini` -->
<!-- * Remote action router -->
<!-- * Remove support for legacy sharding -->
<!-- * Add support for execution timeout compensation via HTTP -->
<!-- * Add support for OAuth in HTTP clients -->
<!-- * Add support for PKCE in OIDC authenticator -->
<!-- * Add basic support for ALTS authentication -->
<!-- * Additional hashing function support: -->
  <!-- - `blake3` -->
  <!-- - `GITSHA1` -->
<!-- * Generic gRPC stream forwarding -->

## Relaunch Buildbarn processes with PID 1

Buildbarn binaries will now relaunch themselves in a child process, if the PID is 1.
This removes the need to run bb-runner through `tini` as zombie processes in containers
no longer is an issue.

## Add support for execution timeout compensation via HTTP

bb-worker can now be configured to allow control of the execution timeout timer via HTTP. It is configured by specifying two URLs which are called by the worker: `suspend_url`, whose response controls whether the timeout timer is suspended, and `resume_url` whose response controls whether to resume the timer.

## ZStandard compression controls

bb-storage can now use zstd for compressing 

## Remote Action Router

## Remove support for legacy sharding

A previous version of the sharding implementation was kept available for migration purposes, but it is now removed.

## Remote Execution: Add chunking algorithm

## HTTP Authentication

Buildbarns HTTP client now supports OAuth Client Credential flow, and PKCE has been added as an option to the OIDC authenticator.

## gRPC Authentication

The gRPC server component now supports basic ATLS.

## Support for additional hashing algorithms

Two hashing algorithms has been added Buildbarns digest component: [blake3](https://github.com/buildbarn/bb-storage/pull/307) and [GITSHA1](https://github.com/buildbarn/bb-storage/pull/308).

## Generic stream forwarding

A Buildbarn frontend can now be configured to forward gRPC streams.

<!-- ## `bazel-remote-apis`

`9ef19c6b5fbf77d6dd9d84d75fbb5a20a6b62ef1` -> `715b73f3f9e4c70b22854e3cf8a927a9077dde1c`


* (Docs) `e94a7ece2a1e8da1dcf278a0baf2edfe7baafb94`: Proto file docs
* (Docs) `2c3c141e0e4ca43f08abf7ef9046f15e059c3214`: Minor README.md update
* (Docs) `824e1ba94b2db15f68ceff97ae6da503fbc26985`: New URL in README
* (Feat) `ac2964dc20a8c57298f1624eb72703b27ace9d69`: Load rules which no longer are loaded by default in Bazel 9
* (Docs) `0425bb9b8318bd7b965dd800e0c4a054c62d5353`: Update CODEOWNERS
* (Docs) `3860ca2d3e559d487b7d4ad07aa2a4a08d7624da`: Rename field in `remote_execution.proto`
* (Docs) `3051389c06348307437e92e3a1d3c6d6566094b4`: Update CODEOWNERS
* (Docs) `016806f6b7a42335995cb8e4396364daadc4cd3a`: Proto docs
* (Docs) `b02e15a6d354e2fb553216132ccec79f3f5b39cb`: Proto docs
* (Docs) `a53f8123bf8cdb7b5928c06a82793be4a138b6bb`: Update README
* (Docs) `080cf125032eb61b21a53c72c1a09a45145fc152`: Proto docs
* (Docs) `2f6947fc4122dfaca8f38ddb949ec9113d87bdae`: Update README
* (Feat) `de5501d284d7792ab9e5469b488ecaba341122a3`: Add chunking algorithm
* (Docs) `e4515f056981152c8ee61d003c28bffff3196970`: Proto docs
* (CI) `3ab11507f926b205d4f78f56bcff17c37b0e3642` Add step in CI checks if generated code is up to date
* (Feat) `9e084d0e43e717128ee72b5be584a7ba33e8006b`: Bump Bazel version and deps to version 9
* (Docs) `715b73f3f9e4c70b22854e3cf8a927a9077dde1c`: Proto docs

## `bb-browser`

`823deb2f4b072d5e0d86b6260819b5f3755e6aba` -> `1731858db193643641ad80e8485eec29c88113fb`

* (Feat) `d115d51d178dd8a762916d298169bf04abafd73e`: Upgrade to the latest version of bb-storage/remote-apis, revise import prefix to make consistent with rest of Buildbarn projects
* (CI) `cb645aa363a9bbc69da62ca45df880fe25df013e`: Aspect Workflows setup
* (CI) `9886820de1cc9ad4183bf765266161260d514d91`: Aspect Workflows setup
* (Feat) `ef9eacb9d60aa8a1b09a6788751a58f3229fd589`: Bump Bazel version and deps to version 9
* (Feat) `765b497e89eefc1fa39acb015559ce0c9c490dd7`: Remove support for REv2.0
* (Feat) `b82789fb48da215a93c9fed606fe171be7479f92`: Update Buildbarn components and Go dependencies
* (Feat) `1731858db193643641ad80e8485eec29c88113fb`: Update Buildbarn components; includes API changes from bb-storage (Zstandard encoder/decoder)

## `bb-remote-execution`

`efef252cdf4f97cc0154ea02976ed1322587e599` -> `e6ab874a1bc0cf690ae43f6f98bace2fb1f92cf2`

* Don't enable NFSv4.1 by default
* `4cfaff274b612482ef98dd145bac24aded73c132`: Add support for NFSv4 named attributes
* `b1589bb81654a350297619eccc7d56ba53e6e000`: Branch `master` -> `main`
* `44156572da4cef72713cfcc2f1a80f3979ae427c`: Add support for execution timeout compensation via HTTP
* `a750e60fa89bb5042df43039d226a51940762b28`: Upgrade to Bazel 9.0.0rc1
* `babfe8f73772adb40306ee23546d3f827d120998`: Allow Action router to mutate Actions and implement a remote action router
* `749fb408bd300672b8f13860253d07fdc26c49ff`: Get rid of `tini`
* `e6ab874a1bc0cf690ae43f6f98bace2fb1f92cf2`: Remove support of REv2.0 + REv2.1


## `bb-storage`

`fbb7c11d3502dbd1ee72a5d6a5a92ef532ee3c6e` -> `d0c6f2633bb9e199fc7285687cdd677660dc688c`

* `a3f0c77a996f0801a875a604c22608d94f06c910`: Add OAuth client_credentials
* `b1589bb81654a350297619eccc7d56ba53e6e000`: Branch `master` -> `main`
* `267d6195655f548609a004b35e9d72ae947c7947`: Revise import prefix
* `3c0eb5f6f1bae8f0af2cdc66e67ce43eaaa82ebd`: Add support for PKCE in the OIDC authenticator
* `7ca8e392c0fb11182f44af9ffe87a255f17f6c6a`: Add basic support for ALTS authentication
* `d5cf947f8d35e5a4afe2aab12e3fbb8764d24099`: Change how images are built and published
* `14e58f4631ad20fff197b2f4a8e36a6cdca92379`: Support blake3 hashing
* `51e1a67922e22d65445f43aa809636cb481644f3`: Remove support for legacy sharding
* `5b5db75d620841b08c02f04f817652d4ebc949ce`: Add generic gRPC stream forwarding
* `797be97c5d2c216dafb4c4345e24003952c71561`: Add support for digest function GITSHA1
* `3dee6dd59e9885fcf457bb5f019a9656c79dd52d`: Upgrade to Bazel 9
* `d2a3a16763ee8a62125d9c57b7a12bf5d9ae0789`: On Linux, relaunch the current process when running as PID 1
* `742fac709e76152cb989ab3fc906913b4e6c8f7d`: Windows Docker image publishing
* `f62d21c785f14e47af523673ed2827206b3d5161`: ZStd compression, allows disabling/enabling zstd compression for storage backend
* `f48c18e95728c9274d06d52d9c41120fd9e34b48`: ZStd compression, additional configuration options
* `bbf587e8a88cfc6b4e47ae0926939fcd47a66e8b`: Remote `rules_proto` dep
