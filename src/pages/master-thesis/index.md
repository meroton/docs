# Master Thesis

Meroton offers master thesis work. As a master thesis student, you will sit
together with our team in our Linköping office and get daily direct support in
your task.

## Reduce Build Times by Trimming Input File Trees

### Background

Large scale development projects often suffer slow continuous testing
experience. A build tool like [Make](https://www.gnu.org/software/make/) runs
lots of actions, e.g. compiling a file, linking a binary or executing a test.
Each action can be described by its input file tree and command line. If either
the file tree or the command line changes, the action has to be rerun.

The input file tree has a tendency to be overspecified, for example using a
whole Python package when only a few files are imported. This leads to rerunning
actions when the modified files are not used.

### Task

This thesis project will investigate the potential savings from optimising the
input file trees to the build steps, based on the used files, reported by a
virtual file system (FUSE), instead of the usually overspecified input file
lists. For evaluation, a couple of open source projects will be selected and
evaluated. The task will include Go programming for extracting data and then
analysis using languages of your choice.

### Prerequisites

* Required: Linux programming skills.
* Preferred: Golang knowledge.
