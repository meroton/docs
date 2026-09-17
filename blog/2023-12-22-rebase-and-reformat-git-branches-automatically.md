---
slug: Automatically-reformat-all-commits-on-a-branch
title: Automatically Reformat all Commits on a Branch
authors: nils
tags: [git, unix, linting]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Automatically reformat all commits on a branch

If you have a formatter tool
that can rewrite your code
you can run it automatically on all unmerged commits.
This will show you how to script `git-rebase`
to do so without any conflicts.

There are two ways to do it manually, forward or backward.
The forward pass amends each commit
and deals with the conflicts when stepping to the next commit.
In contrast the backwards pass, formats each commit from the end,
which will avoid conflicts but for long commit chains it can be almost as boring.

This pattern comes up when working with long-lived feature branches,
or tasks that were almost done, and then pre-empted by other prioritized work.
Here are a few oneliners you can run to tidy up your commits.

See also the full technical guide for developing this `git-rebase` workflow
in [our documentation].
Which contains more details on rebasing with `git`,
using a scriptable editor to automate the `git-rebase` todo-list,
as well as the squashed commit messages.

[our documentation]: /docs/practice/rebase-and-reformat-git-branches-automatically
[full technical guide]: /docs/practice/rebase-and-reformat-git-branches-automatically

## Example commits

Say you have three unmerged commits:

    21cc7b5 My amazing feature
    e05fd9f Other complimentary work
    acb9fae Fix annoying bug

They contain important work, but you forgot to run some linters,
or the main branch added more lint requirements
after the feature work was started.
This will run linters that can automatically fix issues on each commit
through a scripted `git-rebase`.

## Rebase algorithm

We have a three-step process to update each commit.

* 1: Create a fixup commit with the applied lint suggestions,
  which we immediately revert
  so the next commit still applies

  ```bash title=reformat.sh
  #!/bin/sh

  # Formatters and fixers go here.
  # Replace with your tools of choice! rustfmt, gofmt, black, ...
  ./run-all-linters-and-autofixers.sh

  # Add a new commit with the changes and revert it again.
  git add -u
  git commit --allow-empty --fixup HEAD
  # 'git-revert' does not support '--allow-empty'.
  git revert --no-commit HEAD
  git commit --allow-empty --no-edit
  ```

* 2: Squash the fixup commit into the original feature commit

* 3: Squash the revert down into the next feature commit

These tabs show how the commits evolve and are squashed,
the extra commits are grouped to indicate the target commit.
The revert of the first commit is grouped with the second feature commit,
and so on.
We discard the final revert.

<Tabs>
<TabItem value="original" label="Original">

```
21cc7b5 My amazing feature



e05fd9f Other complimentary work



acb9fae Fix annoying bug



```

</TabItem>
<TabItem value="reformated" label="1: Reformated" default>

```
21cc7b5 My amazing feature
01900c5 fixup! My amazing feature

55feaba Revert "fixup! My amazing feature"
e05fd9f Other complimentary work
d122da7 fixup! Other complimentary work

249b0d3 Revert "fixup! Other complimentary work"
acb9fae Fix annoying bug
50e426a fixup! Fix annoying bug

7e84259 Revert "fixup! Fix annoying bug"
```

</TabItem>
<TabItem value="fixed-up" label="2: Fixed-up" default>

```
9ed9557 My amazing feature


55feaba Revert "fixup! My amazing feature"
0db521b Other complimentary work


249b0d3 Revert "fixup! Other complimentary work"
e2e991b Fix annoying bug


7e84259 Revert "fixup! Fix annoying bug"
```

</TabItem>
<TabItem value="fully-squashed" label="3: Fully-squashed" default>

```
9ed9557 My amazing feature



8e76352 Other complimentary work



f286036 Fix annoying bug



```

</TabItem>
</Tabs>

## Oneliners

`git` allows us to set any editor to edit the todo-list, `$GIT_SEQUENCE_EDITOR`,
and the commit message, `$EDITOR`.
We choose `vim` as it is often available, and easier to use than `sed` and `awk`.
It is nice to have a _scriptable_ interactive editor
to make changes to the workflow and try out the commands.

See the [full technical guide] for details and more tips on `git-rebase` and `vim`.


Reformat:
```
$ env                          \
    GIT_SEQUENCE_EDITOR="true" \
    git rebase -i --exec ./reformat.sh origin/main
```
Fixup (autosquash):
```
# More robust autosquash, that handles duplicated commit messages.
# If your commit messages are all unique you can use '--autosquash' instead.
# See the technical guide for more details.
$ env                                                             \
    GIT_SEQUENCE_EDITOR="vim +'g/^\w* \w* \(# \)\?fixup!/s/^pick/fixup/'" \
    git rebase -i origin/main
```
Squash:
```
$ env                                                                                               \
    EDITOR="sed -i '1,9d'"                                                                          \
    GIT_SEQUENCE_EDITOR="vim +'g/^#/d' +'normal! Gdk' +'g/^pick \w* \(# \)\?Revert \"fixup!/normal! j0ces'" \
    git rebase -i origin/main
```

:::info
We have not developed the *incantation*, `git-rebase` command,
to preserve the author date from the original commits.
We will address that next!
:::
