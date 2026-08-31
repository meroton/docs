---
slug: plotting-memusagestat-data-points
title: Plotting Memusagestat Data Points in Python
authors: nils
tags: [linux, glibc, python]
---

`memusage` is a great tool to track all allocations for a program,
this comes to many Linux distributions with `glibc` itself.
So if you need a quick-and-easy allocation tracker `memusage` is the tool for you!
There is a plotter, `memusagestat`,
that can draw a simple image for you.
However, it shows its age and is inconvenient to work with.
So we have create a new plotter in Python
to help you track and visualize allocations.

![Improvement](/img/memusagestat-bazel-improvement.png)

This came up during our preparations for the Bazelcon talk [Dude, where is my RAM?].
But the investigation and the graphs produced by `memusagestat` did not make the cut for the talk.
Nevertheless, it was interesting to tinker with these tools
and we hope it can be useful for you, to use the new plotter,
or better understand how to work with core Linux programs like this.

[Dude, where is my RAM?]: /blog/memory-adventure/

You can read the full document here: [Plotting memusagestat's data].
There are two take-home messages:

  1. A case-study in building and modifying `glibc` tools for your computer:
  here: [building glibc](/docs/practice/plotting-memusagestat-with-python#building-memusagestat-and-glibc).
  This includes debugging mysterious crashes before the start instruction
  in an ELF program.

  2. Our code to plot allocations for your programs.
  Read the [Python script](/docs/practice/plotting-memusagestat-with-python#Parse-the-binary-file-in-Python)
  section, and checkout the code [from github].

[Plotting memusagestat's data]: /docs/practice/plotting-memusagestat-with-python/
[from github]: https://github.com/meroton/plot-memusage
