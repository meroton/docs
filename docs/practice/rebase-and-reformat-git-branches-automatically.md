import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Automatically reformat all commits on a branch

## Preliminaries

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
To make sure that all commits are up to the latest standard
you can run the oneliner(s) from the end of this document.

### Unix philosophy

This guide shows a powerful `git` workflow,
as it is designed with the _Unix philosophy_ much can be automated and scripted.
We use `vim` as a scriptable editor,
as it is the author's daily driver,
but any editor can be used.
An interactive editor is better than simply using `awk` or `sed`,
as it allows you to step through the process
and augment it to fit your needs.

If you are a `vim` user we hope this can brighten your day
and give you another arrow or two to your quiver.

### Example commits

Starting off we have three example commits that we will manipulate:

    aaa My amazing feature
    bbb Other complimentary work
    ccc Fix annoying bug

They contain serious work, but the distracted author forgot to run some linters,
or the main branch added more lint requirements after the feature work was started.
We value pristine commits that we can merge,
and all commits should pass all the tests,
to help with bisecting potential errors later.

## First wave: reformat

### Reformat each commit

We start with a script that we want to run:

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

### Rebasing

The first step is to run the formatting script for every commit:

```
$ git rebase -i --exec=./reformat.sh origin/main
```

This opens the interactive rebase todo list with the `execute` commands filled in:

```bash title=.git/rebase-merge/git-rebase-todo
pick aaa My amazing feature
exec ./reformat.sh
pick bbb Other complimentary work
exec ./reformat.sh
pick ccc Fix annoying bug
exec ./reformat.sh

# Rebase aaa..ccc onto deadbeef (3 commands)
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup [-C | -c] <commit> = like "squash" but keep only the previous
#                    commit's log message, unless -C is used, in which case
#                    keep only this commit's message; -c is same as -C but
#                    opens the editor
# x, exec <command> = run command (the rest of the line) using shell
# ...

```

:::info
If you made a mistake and want to abort the rebase, without applying any commands exit the editor with a non-zero exit code.
in `vim` you can do that with `:cq`.

To optimize the save-and-quit from `:wq<enter>` you can instead press `ZZ` in normal mode.
:::

This will create two additional commits for each original,
here denoted with helpful commit hash prefixes.
They are grouped together into the final commits that we want to create.

<Tabs>
<TabItem value="reformated" label="1: Reformated" default>

```
aaa My amazing feature
aa1 fixup! My amazing feature

aa2 Revert "fixup! My amazing feature"
bbb Other complimentary work
bb1 fixup! Other complimentary work

bb2 Revert "fixup! Other complimentary work"
ccc Fix annoying bug
cc1 fixup! Fix annoying bug

cc2 Revert "fixup! Fix annoying bug"
```

</TabItem>
<TabItem value="original" label="Original">

```
aaa My amazing feature



bbb Other complimentary work



ccc Fix annoying bug



```

</TabItem>
</Tabs>

The reverts make sure that whatever was broken in each commit is restored,
so the next commit applies cleanly.
`aaa`, `aa1` and `aa2` are the old unit of a commit.
The desired goal is to have the reformatted `aaa`
and move the unit-boundary after the reformatting fixup.

The desired units are: first `aaa`, `aa1`,
then `aa2`, `bbb`, `bb1`
and `bb2`, `ccc`, `cc1` last.

Notice that the final revert `cc2`
is not needed and must be discard at some point.
We will do it in the second wave,
but you could do it whenever.
(At this point it is possible to just run `git checkout HEAD~1`.
if you step through this manually it is the most pragmatic solution.)

## Second wave: fixup

We proceed to the first fixup stage.

```
git rebase -i origin/main
```

```bash title=.git/rebase-merge/git-rebase-todo
pick aaa My amazing feature
pick aa1 fixup! My amazing feature
pick aa2 Revert "fixup! My amazing feature"
pick bbb Other complimentary work
pick bb1 fixup! Other complimentary work
pick bb2 Revert "fixup! Other complimentary work"
pick ccc Fix annoying bug
pick cc1 fixup! Fix annoying bug
pick cc2 Revert "fixup! Fix annoying bug"
```

Which is modified with the following search-and-replace in `vim`:

```
:g/^\w* \w* \(# \)\?fixup!/s/^pick/fixup/
^                                 : command
 ^                                : for all lines
  ^               ^               : that match
   ^^^^^^^^^^^^^^                 : Regexp: <beginning of line><word> <word>fixup!
                   ^^     ^     ^ : search and replace
                     ^^^^^        : Regexp: <beginning of line>pick
                           ^^^^   : replace with 'fixup'
```

Into:

```bash title=.git/rebase-merge/git-rebase-todo
pick aaa My amazing feature
fixup aa1 fixup! My amazing feature
pick aa2 Revert "fixup! My amazing feature"
pick bbb Other complimentary work
fixup bb1 fixup! Other complimentary work
pick bb2 Revert "fixup! Other complimentary work"
pick ccc Fix annoying bug
fixup cc1 fixup! Fix annoying bug
pick cc2 Revert "fixup! Fix annoying bug"
```

This gives us:

<Tabs>
<TabItem value="fixed-up" label="2: Fixed-up" default>

```
Aaa My amazing feature


aa2 Revert "fixup! My amazing feature"
Bbb Other complimentary work


bb2 Revert "fixup! Other complimentary work"
Ccc Fix annoying bug


cc2 Revert "fixup! Fix annoying bug"
```

</TabItem>
<TabItem value="reformated" label="1: Reformated" default>

```
aaa My amazing feature
aa1 fixup! My amazing feature

aa2 Revert "fixup! My amazing feature"
bbb Other complimentary work
bb1 fixup! Other complimentary work

bb2 Revert "fixup! Other complimentary work"
ccc Fix annoying bug
cc1 fixup! Fix annoying bug

cc2 Revert "fixup! Fix annoying bug"
```

</TabItem>
<TabItem value="original" label="Original">

```
aaa My amazing feature



bbb Other complimentary work



ccc Fix annoying bug



```

</TabItem>
</Tabs>


`aaa` and `aa1` are combined into a single well-formatted commit `Aaa`,
but the formatting is removed in the following `aa2`,
so the original `bbb` still applies (but it is folded into `Bbb`).

### Why not `--autosquash`?

This is a good question, the `--autosquash` flag has long been a staple for me.
But it does not work if there are duplicated commit messages in the commit chain,
which is a general problem with such messages
not specific to this workflow.

A less-than-imaginative "tidy up" commit message may trip up this flow.
Where all "fixup! tidy up" commits will be applied to the first "tidy up" commit.
To be robust, we do it in vim directly.
It is a simple search and replace,
and serves as the most complete example.
If you do not have duplicated commit messages, you can use `--autosquash` instead.
Just note that the code to _verify_ that the messages are unique,
is more complex that this workaround.

## Third wave: squash reverts

Now we want to squash each pair of `Revert-fixup` and `real-commit`
into just `real-commit`.

This is a little tricker than before,
so for good measure we check all the lines we want.
This is shows that you can reuse the last search pattern in the replacement later,
but has not practical value for the automation.

:::info

If you use _neovim_ you should use `:set inccommand=split`
which will show the search-and-replacement that would be applied as you type!

:::

```
(vim) /^pick \w* Revert "fixup!
      ^                         : search
       ^                        : Regexp: <beginning of line>pick <word> Revert "fixup!
```

This just searches for the revert-fixup commits,
to illustrate that the `:g` command can use the last search,
this is useful when writing complex regular expressions
and to check that they work.

```
(vim) :g//normal! j0ces
      ^                 : command
       ^                : for all lines
        ^^              : that match (the last search pattern!)
          ^^^^^^        : execute normal mode commands
                  ^^    : go down and to the first column
                    ^^  : change until the end of the word
                      ^ : to "s", short for squash.
```

Putting it together:

```
git rebase -i origin/main
```

```bash title=.git/rebase-merge/git-rebase-todo
pick Aaa My amazing feature
pick aa2 Revert "fixup! My amazing feature"
pick Bbb Other complimentary work
pick bb2 Revert "fixup! Other complimentary work"
pick Ccc Fix annoying bug
pick cc2 Revert "fixup! Fix annoying bug"

# Rebase Aaa..cc2 onto deadbeef (3 commands)
# ...
```

First search-and-replace the pick of revert commits to squashes,
but squash the next line into the revert,
then remove all comment lines
and finally delete the two last lines (a blank line and the final commit).

```
:g/^pick \w* \(# \)\?Revert "fixup!/normal! j0ces
:g/^#/d'
Gdk
```

This yields the final squashes and `cc2` is gone:
```bash title=.git/rebase-merge/git-rebase-todo
pick Aaa My amazing feature
pick aa2 Revert "fixup! My amazing feature"
squash Bbb Other complimentary work
pick bb2 Revert "fixup! Other complimentary work"
squash Ccc Fix annoying bug
```

### Squash messages

We have now done the hard part,
the expected commits are formed with each squash.
However the message needs to be edited,
which is a huge time sink if done manually.
A commit message squash looks like this (with line numbers):

```bash title=.git/COMMIT_EDITMSG showLineNumbers
# This is a combination of 2 commits.
# This is the 1st commit message:

Revert "fixup! My amazing feature"

This reverts commits aa1

# This is the commit message #2:

Other complimentary work
```

The mechanical solution is to delete the first 9 lines.

```
(vim) :1,9d
      ^     : command
       ^^^  : line 1 through 9
          ^ : delete
```

This comes from the `ed` heritage, and can use the same command in `sed`.

### Automate the Squash messages

Thankfully the venerable Unix tools allow us to automate this.
We do not need a hands-on-keyboard editor,
but `sed`, or `ed` if you are frisky,
can do it for us.

We can experiment with a small file:

```
$ seq 9 > test.file
$ echo "10: abc" >> test.file
$ wc -l test.file
10 test.file

$ sed '1,9d' test.file
10: abc

# Now remove them from the file itself
$ sed -i '1,9d' test.file
$ cat test.file
10: abc
```

This is the editor that we will use when rebasing.
Git allows us to set `$EDITOR` to edit the commit messages,
and `$GIT_SEQUENCE_EDITOR` to manipulate the interactive rebasing commands.
If the sequence editor is not set `git` will edit the rebase-todo file with `$EDITOR` as well,
leading to predictable but unwanted results.

```
$ env                         \
    GIT_SEQUENCE_EDITOR="vim" \
    EDITOR="sed '1,9d'"       \
    git rebase -i origin/main
```

Now search again and rewrite the squash commands.
Do not forget to delete the trailing stuff.

To automate the entire wave with the `vim` commands
is left as an exercise to the reader :).

Finally, smile as you close the editor and watch git's messages fly.

### Result

<Tabs>
<TabItem value="fully-squashed" label="3: Fully-squashed" default>

```
Aaa My amazing feature



BBb Other complimentary work



CCc Fix annoying bug



```

</TabItem>
<TabItem value="fixed-up" label="2: Fixed-up" default>

```
Aaa My amazing feature


aa2 Revert "fixup! My amazing feature"
Bbb Other complimentary work


bb2 Revert "fixup! Other complimentary work"
Ccc Fix annoying bug


cc2 Revert "fixup! Fix annoying bug"
```

</TabItem>
<TabItem value="reformated" label="1: Reformated" default>

```
aaa My amazing feature
aa1 fixup! My amazing feature

aa2 Revert "fixup! My amazing feature"
bbb Other complimentary work
bb1 fixup! Other complimentary work

bb2 Revert "fixup! Other complimentary work"
ccc Fix annoying bug
cc1 fixup! Fix annoying bug

cc2 Revert "fixup! Fix annoying bug"
```

</TabItem>
<TabItem value="original" label="Original">

```
aaa My amazing feature



bbb Other complimentary work



ccc Fix annoying bug



```

</TabItem>
</Tabs>

### Author date?

We have not developed the *incantation*, `git-rebase` command,
to preserve the author date from the original commits.
But it is an interesting problem that we will address next.

In short the rebase-squash in the _third wave_
will reset the author time, to the time of the revert.
Here a `x git commit --amend --time=<time of the original commit in the squash>`
or `x git commit --amend --reuse-message=<original commit hash>`
should do the trick.

Ta Da!

That is it, you now have transformed all the commits in your commit chain.

## Oneliners

Now that we have done it manually
and understand what happens,
we can automate all the vim steps.

First wave:
```
$ env                          \
    GIT_SEQUENCE_EDITOR="true" \
    git rebase -i origin/main --exec ./reformat.sh
```
Second wave:
```
$ env                                                             \
    GIT_SEQUENCE_EDITOR="vim +'g/^\w* \w* \(# \)\?fixup!/s/^pick/fixup/'" \
    git rebase -i origin/main
```
Third wave:
```
$ env                                                                                               \
    EDITOR="sed -i '1,9d'"                                                                          \
    GIT_SEQUENCE_EDITOR="vim +'g/^#/d' +'normal! Gdk' +'g/^pick \w* \(# \)\?Revert \"fixup!/normal! j0ces'" \
    git rebase -i origin/main
#                            ^         ^              ^ : multiple commands
#                              ^^^^^^                   : remove all comments lines
#                                        ^^^^^^^^^^^    : delete the last two lines
# TODO: Preserve author time
```

## Extra rebase tips

From frequent rebasers here are two tips
to help you rebase quickly.

### Cache work when running tests on all commits

You can use a simple cache when executing tests on all commits.
Which allows you to loop through the commits multiple times,
and only re-run tests if a commit has changed.
This is _very_ fast, but has all the limitations of cache management.

```bash title=cache
#!/bin/sh

CACHE=./.user/cache/
mkdir -p "$CACHE"

set -eu

lookup () {
    key=$1; shift
    test -f "$CACHE/$key"
}

cache () {
    key=$1; shift
    touch "$CACHE/$key"
}

key="$(git rev-parse HEAD)"
lookup "$key" && { echo "cached $key"; exit 0; }
"$@"

cache "$key"
```

You can now execute `reformat.sh` in the interactive rebase todo-editing window:
```
(vim) :g/pick/normal! ox ./cache ./reformat.sh
```

### Help, I'm lost

You can always drop a branch before rewriting,
to avoid digging through `git-reflog` to find where you were.
Julia Evans explains this and many other facets of a rebase-based workflow on [her blog],
which is very informative.

[her blog]: https://jvns.ca/blog/2023/11/06/rebasing-what-can-go-wrong-/#undoing-a-rebase-is-hard

```
$ git branch reformat-$(date)
```
