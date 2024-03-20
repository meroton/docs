import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Debug Bazel rules_go projects

Case study: Buildozer

The other day I needed to improve [`buildozer`] a little
and naturally wanted to run `buildozer` in the [`dlv`] debugger.
I learn by doing and think through debugging.
Where I would previously use the [execroot trick]
to debug programs that operate on absolute paths
it did not work for this.
`buildozer` operates on the current working directory
so executing it from within Bazel's output directory does not work.

Instead I used the [substitute path technique] from [rules_go],
thanks Danny!
This article is a little show-case
for how you can easily do the same in your terminal
and with configuration your IDE too.
It leverages several cool `dlv` features.
I will show you how to:

* Debug `buildozer`
* Find all the debug symbols
* Manage debug symbols for multiple go projects in different bazel projects.

The techniques are general and work for many languages,
only the tooling differs.
You can do the same for `gdb` and [`rr`] when building C/C++ code.

[`rr`]: https://github.com/rr-debugger/rr
[`buildozer`]: https://github.com/bazelbuild/buildtools/blob/master/buildozer/README.md
[`dlv`]: https://github.com/go-delve/delve/
[execroot trick]: /docs/tips/debug-bazel-go-projects/#execroot-trick
[substitute path technique]: https://github.com/bazelbuild/rules_go/issues/1708#issuecomment-791114337
[rules_go]: https://github.com/bazelbuild/rules_go/

## Substitute path

Substitute path is a common debugger command to change where to look for debug symbols.
Programs compiled with debug symbols have paths to the source files,
which often works well.
But binaries built by Bazel
need some extra care.
For its _sandbox_ and _execroot_ directory structure
does not look like the source code tree.

One big source of confusion is the `external/` directory
where all external code is put in a flat hierarchy.
The code could come from any remote repository,
or even be bundled with the source code of the program
at an arbitrary location in the source tree.

For the [buildtools] project we use the following substitute paths
with the `<BUILDTOOLS>` placeholder for the repository path.
`/bazel-buildtools` is the [convenience symlink] to the _execroot_,
if you do not build them instead use `$(bazel info output_path)/..` to find the path.

```
(dlv) config substitute-path external/ <BUILDTOOLS>/bazel-buildtools/external
(dlv) config substitute-path GOROOT/   <BUILDTOOLS>/bazel-buildtools/external/go-sdk
(dlv) config substitute-path ""        <BUILDTOOLS>/bazel-buildtools/
```

## Initialize delve with project-specific settings

You _could_ use `dlv`'s configuration file to save these.
If you only work with one project that works fine.
_The_ config file is singular for your computer:
`$XDG_CONFIG_HOME/dlv/config.yml` or `~/.dlv/config.yml`.
It is a natural location for your debugging preferences,
but not to describe how individual projects work.
The config file is [documented here].

[documented here]: https://github.com/go-delve/delve/blob/master/Documentation/cli/README.md

To set settings for a specific project
use the `--init <command file>` flag.
You can provide any debugger commands here,
it will initialize the debugging session
as if they were written interactively.

First, compile and store the path information
we need to debug `buildozer`.

```
buildtools $ export BUILDTOOLS=$PWD
buildtools $ bazel build -c dbg //buildozer
Target //buildozer:buildozer up-to-date:
  bazel-bin/buildozer/buildozer_/buildozer
buildtools $ export BUILDOZER="$(readlink bazel-bin/buildozer/buildozer_/buildozer)"

# We can now run 'buildozer' in our project.
buildtools $ cd /path/to/project
```

Then, open `buildozer` in the debugger.
This uses the shell pseudo-file redirection to in-line the commands.
You can also save them to a file for the project.

<Tabs>
<TabItem value="bash" label="Bash" default>

```
project $ dlv exec --init <(echo '
    config substitute-path external/ '"$BUILDTOOLS"'/bazel-buildtools/external
    config substitute-path GOROOT/   '"$BUILDTOOLS"'/bazel-buildtools/external/go-sdk
    config substitute-path ""        '"$BUILDTOOLS"'/bazel-buildtools/
    print "You can also set break points and automatically start the program."
    break main.main
    continue
') "$BUILDOZER" -- -h
```

```
# Create and use 'substitute-path.dlv' for the buildtools project.
project $ dlv exec --init "$BUILDTOOLS"/substitute-path.dlv "$BUILDOZER" -- -h
# Augment it with ad-hoc commands.
project $ dlv exec --init <( {
    cat "$BUILDTOOLS"/substitute-path.dlv
    echo 'break main.main
    continue'
} ) $BUILDOZER -- -h
```

</TabItem>
<TabItem value="fish" label="Fish">

```
project $ dlv exec --init (echo '
    config substitute-path external/ '"$BUILDTOOLS"'/bazel-buildtools/external
    config substitute-path GOROOT/   '"$BUILDTOOLS"'/bazel-buildtools/external/go-sdk
    config substitute-path ""        '"$BUILDTOOLS"'/bazel-buildtools/
    print "You can also set break points and automatically start the program."
    break main.main
    continue
' | psub) "$BUILDOZER" -- -h
```

```
# Create and use 'substitute-path.dlv' for the buildtools project.
project $ dlv exec --init "$BUILDTOOLS"/substitute-path.dlv "$BUILDOZER" -- -h
# Augment it with ad-hoc commands.
project $ dlv exec --init ( begin
    cat "$BUILDTOOLS"/substitute-path.dlv
    echo 'break main.main
    continue'
end | psub ) $BUILDOZER -- -h
```

</TabItem>
</Tabs>

[convenience symlink]: https://bazel.build/remote/output-directories#layout
[buildtools]: https://github.com/bazelbuild/buildtools

## Execroot trick

If the execution directory of the program does not matter
you can execute it directly from the _execroot_,
where all source files are available as they were during compilation in the sandbox.
So the debug symbol paths are correct.
First build, then translate the `bazel-bin` convenience symlink target
to the real `bazel-out` path
(`bazel-bin` is not available in the _execroot_).

```
$ bazel build -c dbg //buildozer
Target //buildozer:buildozer up-to-date:
  bazel-bin/buildozer/buildozer_/buildozer
$ cd bazel-buildtools
$ dlv exec bazel-out/k8-dbg/bin/buildozer/buildozer_/buildozer -- -h
(dlv) b main.main
Breakpoint 1 set at 0x6e0a32 for main.main() buildozer/main.go:80
(dlv) c
 main.main() buildozer/main.go:80 (hits goroutine(1):1 total:1) (PC: 0x6e0a32)
 ...
=>  80: func main() {
    81:         flag.Var(&commandsFiles, "f", "file name(s) to read commands from, use '-' for stdin (format:|-separated command line arguments to buildozer, excluding flags)")
```

No settings are needed for `dlv`.

Finding the `bazel-out` path is easy with `readlink`.
This is the permanent output location,
until you change the program or clean away all artifacts.
`bazel-bin` is just the last build and is frequently rewritten.

```
buildtools $ readlink bazel-bin
.../9cc0cee4950d14fcd8254d5df1538d8e/execroot/buildtools/bazel-out/k8-dbg/bin
```
We need `bazel-out/k8-dbg/bin`.
