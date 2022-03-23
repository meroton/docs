---
sidebar_position: 1
---

# Components of a Build

A build is a pretty abstract concept, for many developers it's what happens when you press `f5` but before your application starts. So what does happen when you press `f5`? Well that depends on your underlying environment, but in general it runs a couple of actions.

## What is an Action?

An action is something that takes input and produces output, an example of a simple action could be described by the command `cp example.txt example-copy.txt` which executes the executable `cp` with `example.txt` as its input and creates `example-copy.txt` as its output.

For a more relevant but still small example consider the following `C` project which consists of a static library `lib` and a `main.c` file consuming that library.

```
// main.c
#include "lib.h"

void main() {
  hello();
}

---

// lib.h
void hello();
void world();

---

// lib.c
#include "lib.h"
#include "stdio.h"

void hello() {
  printf("Hello ");
}

void world() {
  printf("World!);
}

```

We can compile this project with these 4 commands each representing an action

```
 $> cc -c -o lib.o lib.c      # compile library into object file
 $> ar rcs lib.a lib.o        # turn library object files into a static library (an archive)
 $> cc -c -o main.o main.c    # compile main.c into an object file
 $> cc main.o lib.a -o main   # link our library and our object file into an executable
```

## Incremental Builds

The previous actions can be displayed with this dependency graph<sup>[1](#note-1)</sup>

<a title="Simplified dependency graph for our example" href="#note-1" >
  <figure>
    <img alt="" src="/img/dependency_graph.drawio.svg" />
    <figcaption></figcaption>
  </figure>
</a>

If we make a small modification to the `main.c` file

```
// main.c
#include "lib.h"

void main() {
  hello();
  world();
}
```

Then we only have to perform two actions, recompiling the `main.c` file and relinking (this is what is usually called an incremental build).

<a title="Incremental build graph for our example">
  <figure>
    <img alt="" src="/img/dependency_graph_incremental.drawio.svg" />
    <figcaption></figcaption>
  </figure>
</a>

A lot of developers have issues with their incremental builds where they are not stable, therefore requiring a clean build before building again. There are a few common reasons this would happen:

1. Race conditions, files can be modified during the build leading to some files incorrectly being consided unchanged since the last build
2. Imperfect method of checking for changes, such as comparing timestamps of the files instead of the content
3. Changed but unspecified dependencies, happens when your dependency graph is incomplete

In a large project the vast majority of files will be untouched in between two different builds, therefore developers can expect a huge performance increase by by making sure that the incremental builds work correctly, as well as saving them a lot of headaches about peculiar bugs happening randomly.

## Deterministic Compilations

The dependency graph helps us figure out which actions might need to be rerun, but sometimes an action might result in the same result as before. In that case we wouldn't want unnecessary actions to run further down in the tree.

Consider the case where we add a comment to our header file, documenting what the code does.

```
// lib.h

// Prints "Hello" to the standard output
void hello();

```

Studying our dependency graph we see that we need to compilate of `lib.o` as well as a compilation of `main.o` the output of those compilations do not change. This means the creation of a static library and the linking step can be short-circuited and the result of the previous compilation returned instead.

<a title="Short-circuited incremental build graph for our example">
  <figure>
    <img alt="" src="/img/dependency_graph_short_circuited.drawio.svg" />
    <figcaption></figcaption>
  </figure>
</a>

This works because our build step is reproducible (often called a deterministic build), running it several times produces the exact same output. For the vast majority of software this is the intended behaviour. There are several advantages to having reproducible builds and there are very few valid reasons not to. However, sometimes the world doesn't work the way we want it to and fixing the issue is outside of our power, perhaps a piece of third party software is adding random timestamps or ids to the output. At those times you can often ignore the issue, try to move the non-determinism away from hot paths is your code so as to minimize the amount of wasted effort.

If you purposefully want the output to be non-deterministic it is better to add a dependency to a random source than to introduce it in your codebase, i.e. have the current time or a random seed as a dependency.

---

<span id="note-1">Note 1:</span>

As a simplification we do not illustrate the implied action dependencies. I.e. `main.o` is not dependent on `main.c` or `lib.h` but only on the action described by `cc -c main.c -o main.o` which in turn is dependent on `main.c` and `lib.h`.

There are also a few implied dependencies here, notably the compiler, the c-standard library and its header files (usually located in `/usr/include`) as well as a few implied flags about compilation target. This is rarely a problem for the standard library but when you include more esoteric libraries version incompatibilities will rear its ugly head. This entire class of problem can be eliminated by containerizing our builds, i.e. the compilation is run by a well defined compiler inside a container, the container becomes part of the dependency graph and any forgotten dependencies will become immediately apparent (since the container wont know of them).
