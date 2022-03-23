---
sidebar_position: 1
---

# Introduction

<a title="'Are you stealing those LCDs?' 'Yeah, but I'm doing it while my code compiles'" href="https://xkcd.com/303/" >
  <figure>
    <img alt="" src="/img/xkcd_compiling.png" />
    <figcaption>xkcd.com</figcaption>
  </figure>
</a>

Compiling, and the tediousness of waiting for your compiles to be completed is probably as old as computing itself. Since [Make](<https://en.wikipedia.org/wiki/Make_(software)>) was invented in 1976 we've learned a lot about how to make the computer build our code quickly and correctly. But our builds are often still slow.

Luckily, they don't have to be. Slow builds are often a consequence of not fully specifying the dependencies and not taking advantage of the modern reality in which we live.

## So, how do we solve it?

It's simple, just follow these three steps:

1. Make sure your dependency tree is specified
2. Utilize a centralized cache
3. Distribute your build actions

Easy peasy. This will reduce your build time to the depth of your build tree, which even for the largest of projects shouldn't be more than a few steps deep.

...

Why are you still here? Was there something unclear?

Ok, so while it is simple, it's also quite difficult. But follow along and we'll get you up and running.

## Builds, outputs, actions and dependencies

A build has an output, for example executables, a set of resources to deploy to a server or a test result. To reach this output it has to perform a series of actions on your its inputs. The internal relationship between these inputs, actions and output can be described as a dependency tree<sup>[1](#note-1)</sup>.

By structuring the dependency tree as a Merkle tree that incorporates all inputs, outputs and actions with a collision free hash function<sup>[2](#note-2)</sup> we can mechanically structure actions into parallelizable work chunks where parts of the tree can short-circuited in case of unchanged inputs and/or outputs.

This will drastically reduce the amount of work required, especially in organizations where several developers work on the same code codebase, compilations done for one developer can be reused by other developers. And for most developers the build time will be reduced to simply compiling the changed files and linking them together. A build that can short-circuit and access a centralized build cache is probably the most performance increasing action you can do to speed up your build.

---

<p id="note-1">Note 1: Technically a directed acyclic graph</p>

<p id="note-2">Note 2: While there is no such thing as a collision free hash function, that doesn't prevent us from using one anyway.</p>

## Clean builds and its evils

Have you ever heard someone say 'Just run `make clean` first'? This problem in build systems is so common that most developers do not trust their incremental builds. The reason you have to run `make clean` is because the build system is not fully specified, this most often happens because some variable which your builds are dependent on (like a version of your build tool) is not specified in your dependency graph.

Using containers with well known versions of your dependencies and tools is a great best practice, that will not only reduce the risk of a phantom bug showing up for only a single developer but also prevent you from accidentally introducing a transient dependency into your build as well as greatly simplifying your developer onboarding process.

## Deterministic builds

To get the most performance you also have to make sure that your builds are deterministic, i.e. given the same input they should produce the same output. This is pretty much always what you as a developer want, but due to events outside of your control this is not always what happens. One common issue is that the build tool adds a unique identifiers timestamps to your build.

This can often be configured away, but sometimes the best effort solution is to simply minimize non-determinism in your tools. As long as you are not depending on the output being non-deterministic, this will simply lead to performance degradation of your build which might not matter in the long run.

## Remote execution

The final cherry on top of your efforts to speed up your build process will be remote execution. The [Remote Execution API](https://github.com/bazelbuild/remote-apis/) is a standard for serializing arbitrary execution to be run on a different machine. While each developer might have a powerful machine, that machine is nothing compared to a dedicated build cluster that can be scaled independently of the developers machines. While a powerful developer machine might be able to run 16 parallel actions, a sufficiently large build cluster will allow you to run _all_ of them.

## Tooling support

The [Remote Execution API](https://github.com/bazelbuild/remote-apis/) lists supported [clients](https://github.com/bazelbuild/remote-apis/#clients) (build systems) and [servers](https://github.com/bazelbuild/remote-apis/#servers).

At Meroton, we specialize in [Bazel](https://bazel.build/) as client and [Buildbarn](https://github.com/buildbarn/bb-deployments) as server. Bazel is the open source version of Google's internal Blaze build system. Buildbarn is an efficient open source implementation of the server side which is used at scale by several multinational corporations.
