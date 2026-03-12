---
slug: rdeps-and-bazel-dev-dependencies
title: Rdeps and Bazel Development Dependencies
authors: nils
tags: [bazel, buildozer]
---

# Rdeps and Bazel Development Dependencies

## Google test wants to build with cpp17

When reviving an old module that used to build googletest I encountered this error.
Likely because I somehow lost the features setup for the code.

```
ERROR: /home/nils/gits/repo/rule/cc/test/BUILD.bazel:53:8: Compiling rule/cc/test/library_test.cpp failed: (Exit 1): gcc failed: error executing CppCompile command (from target //rule/cc/test:test_binary) external/+gcc+gcc_9.4.0_x86_64_linux_toolchain/usr/bin/gcc @bazel-out/k8-fastbuild/bin/rule/cc/test/_objs/test_binary/library_test.pic.o.params
Remote server execution message: Action details (uncached result): https://buildbarn.example.com/browser/blobs/sha256/historical_execute_response/68a13e98d2231c8055b662fdf84735a648d5c2b074551571b41cccdd70d98f80-1309/
In file included from external/googletest+/googletest/include/gtest/gtest-message.h:57,
                 from external/googletest+/googletest/include/gtest/gtest-assertion-result.h:46,
                 from external/googletest+/googletest/include/gtest/gtest.h:63,
                 from rule/cc/test/library_test.cpp:16:
external/googletest+/googletest/include/gtest/internal/gtest-port.h:273:2: error: #error C++ versions l
ess than C++17 are not supported.
  273 | #error C++ versions less than C++17 are not supported.
      |  ^~~~~
In file included from external/googletest+/googletest/include/gtest/gtest.h:67,
                 from external/googletest+/googletest/src/gtest.cc:33:
external/googletest+/googletest/include/gtest/gtest-param-test.h:483:56: error: missing template argume
nts before '(' token
  483 |           typename StdFunction = decltype(std::function(std::declval<Func>()))>
      |                                                        ^
external/googletest+/googletest/include/gtest/gtest-param-test.h:493:56: error: missing template argume
nts before '(' token
  493 |           typename StdFunction = decltype(std::function(std::declval<Func>()))>
      |                                                        ^
```

While this is a run-of-the-mill error when reviving a project
I wanted to take this opportunity to give `rdeps` and `buildozer` a spin.
So I wouldn't have to update the BUILD files myself.

## Patch googletest to use c++17 for its compilation

For this example I don't pay much attention to mixing standards in one compilation.
We should seek to make 17 the default for the entire code base.

```
+single_version_override(
+    module_name = "googletest",
+    patch_cmds = [
+        """echo 'repo(features = ["-c++14", "c++17"])' > REPO.bazel"""
+    ],
+)
```

## Rdeps and Buildozer

Next we must use the header, which carries the `#error`.
So we want to update all users in our repo
to use c++17 instead of c++14.

Find all targets in the code that directly depend on googletest stuff:

  $ bazel query 'rdeps(//..., @googletest//..., 1) intersect //...'

Then send that to `buildozer`:

  $ buildozer 'add features -c++14 c++17'

## Rdeps does not work in the absence of dev dependencies

```
$ bazel query 'rdeps(//..., @googletest//..., 1) intersect //...'
Starting local Bazel server (8.5.0) and connecting to it...
ERROR: error loading package under directory '': error loading package '@@googletest+//googlemock/test': Unable to find package for @@[unknown repo 'rules_python' requested from @@googletest+]//python:defs.bzl: The repository '@@[unknown repo 'rules_python' requested from @@googletest+]' could not be resolved: No repository visible as '@rules_python' from repository '@@googletest+'.
```

As `rules_python` is a dev dependency
we cannot use it from a consuming module:

```
$ bazel mod deps googletest
<root> (rules_vcc@_)
└───googletest@1.17.0.bcr.2
    ├───abseil-cpp@20240116.2
    │   └───googletest@1.17.0.bcr.2 (cycle)
    ├───platforms@1.0.0
    ├───re2@2025-08-12.bcr.1
    └───rules_cc@0.2.16
```

## Patch the module file?

Will not work, as this is governed by the module file in the registry:
```
single_version_override(
    module_name = "googletest",
    patch_cmds = [
        "sed -i '/dev_dependency = "True"/d' MODULE.bazel
    ],
)
```

## If you have your own registry you can patch it there:

We do have our own registry in our monorepo
so I can patch it there,
notice that this is not a patch file that is applied to the MODULE file,
but a change of the MODULE file itself.

```
bazel_central_registry $ sed -i '/dev_dependency = True/d' registries/bcr.bazel.build/modules/googletest/1.17.0.bcr.2/MODULE.bazel
```

## Shut down Bazel to pick up the change

When working with your own registry one must shut down Bazel between edits
for the module dependency data to be updated.

```
$ bazel shutdown
$ bazel query 'rdeps(//..., @googletest//..., 1) intersect //...'
//rule/cc:runfiles_helper
//rule/cc/test:test_binary
//rule/cc/test:test_cc_legacy_shared
```

## An experimental flag to follow dev dependencies in query?

It would be great if query had a flag to follow all dev dependencies.
To make queries like this possible,
the cost of downloading more modules than strictly necessary for a build
is warranted by enabling Bazel's powerful query system.
Which otherwise sadly does not work for modules with dev dependencies.
