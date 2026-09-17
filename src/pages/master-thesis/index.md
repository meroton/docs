# Master Thesis Projects

Meroton offers opportunities for master theses work. As a master thesis
student, you will sit together with our team in our Linköping office and
get daily direct support from a mentor on your task.

This page lists thesis subjects that we have identified as interesting
and suitable. Alternatively, you are welcome to propose your own
subject.

## Contact Person

Fredrik Medley &lt;fredrik@meroton.com&gt;\
Telephone: +46730739188.

## Predictive Scaling of Dynamic Cloud Workloads

### Background

The IT industry typically scales workloads using discrete, ad-hoc logic
based on resource utilization. While effective for simple cases, these
methods are often suboptimal for highly dynamic workloads, like those in
large build clusters.

Highly dynamic workloads often exhibit a predictable underlying signal
that simple heuristic methods fail to exploit. This thesis project aims
to apply modern control theory to leverage these signals for efficiency
gains.

### Task

The thesis will investigate and quantify the potential savings from an
optimized scaling algorithm. The core task is to develop and evaluate
several general models such as: PID controllers, model predictive
control (MPC), and reinforcement learning (RL) approaches.

The models will be evaluated with real world data. A key part of the
analysis will be comparing the trade-offs between critical performance
indicators like queue sizes, resource overallocation, as well as the
operational effort required from cluster maintainers to keep the system
tuned.

### Prerequisites

- Student in a Master's program for Computer Science, Control
  Engineering, Electrical Engineering, or a related discipline.
- Strong foundation in control theory (PID, MPC) and/or machine
  learning.
- An analytical mindset with the ability to apply theoretical concepts
  to real-world problems.
- Preferred: Golang and Kubernetes knowledge

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

- Required: Linux programming skills.
- Preferred: Golang knowledge.
