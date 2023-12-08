# Plotting memusagestat's data

`memusage` is a great tool to track all allocations for a program,
this comes to many Linux distributions with `glibc` itself.
So if you need a quick-and-easy allocation tracker `memusage` is the tool for you!
There is a plotter, `memusagestat` that can draw a simple image for you,
but it shows its age and is inconvenient to work with.
So we have create a new plotter in Python to help you track and visualize allocations.

![Improvement](/img/memusagestat-bazel-improvement.png)

This came up during our preparations for the Bazelcon talk [Dude, where is my RAM?]
but the investigation and the graphs produced by `memusagestat` did not make the cut for the talk.
Nevertheless, it was interesting to tinker with these tools
and I hope it can be useful for you, to use the new plotter,
or better understand how to work with core Linux programs like this.

[Dude, where is my RAM?]: /blog/memory-adventure/
## memusage & memusagestat

`memusage` is a good profiling tool bundled with `glibc` on Linux,
it tracks allocations for a program.
Its sibling `memusagestat` can plot the allocations,
which is interesting when looking at out-of-memory problems
and garbage-collection/memory thrashing.
The is good for an initial investigation,
there are few options for how to present the data
and the graph itself does not look very nice.
You can select to plot either by sequential allocation or by linear time.
We want to generate new,
nicer looking, figures
for the same data.

In this example use `memusage` to profile a `bazel` invocation that runs out of memory

```
$ memusage --data path/to/bazel.mem \
    bazel build ... \
    //...
```

and render a plot

```
$ memusagestat bazel.mem -T -t
```

![original memusagestat plot](/img/memusagestat-bazel.png)

This does not look very nice.
We should be able to make a nicer plot with a better plotting library.
Note, the x-axis is the number of allocations.
When plotted against time the graph instead looks like a noisy square wave,
which is interesting in its own right.
As we realized in the talk,
Bazel performs a lot of allocations to analyze and build the tree,
then it struggles close to the limit of memory for a long while before crashing.

## Building memusagestat and glibc

### memusage writes a binary datafile

Glancing at [the code] it is quite straight forward
and we should be able to parse it just fine.

[the code]: https://sourceware.org/git/?p=glibc.git;a=blob;f=malloc/memusagestat.c;h=837b613c2bb759fd98572fd7984c0682bf9d43be;hb=HEAD

```
struct entry
{
  uint64_t heap;
  uint64_t stack;
  uint32_t time_low;
  uint32_t time_high;
};

...

static void
update_data (struct header *result, size_t len, size_t old_len)
      /* Write out buffer if it is full.  */
      if (idx + 1 == buffer_size)
        write (fd, buffer, buffer_size * sizeof (struct entry));
      else if (idx + 1 == 2 * buffer_size)
        write (fd, &buffer[buffer_size], buffer_size * sizeof (struct entry));
    }
```

### Compile memusagestat

For good measure we can patch the parsing code in `memusagestat`
to have oracle data for our parser.
`memusagestat` comes with `glibc` and can be built with its `make` build system.
We need to do some preparation, to have all the dynamic libraries work well.
The first step is to use the same version as the host OS.

```
$ ldd --version | head -1
ldd (Ubuntu GLIBC 2.35-0ubuntu3.3) 2.35
```

```
$ git clone https://sourceware.org/git/glibc.git
$ cd glibc
$ git checkout release/2.35/master
```

Then create a build directory and configure the build.
We see an explicit prefix, to safe guard against a `make install`
which could replace the host files.
A warning is raised if prefix is not configured to warn that it could replace core libraries,
and potentially corrupt the operating system.

```
glibc $ mkdir -p build/{prefix,x86_64}
glibc $ cd build/x86_64
x86_64 $ ../../configure --prefix $PWD/../prefix --disable-werror
glibc $ cd -
glibc $ export objdir=$PWD/build/x86_64
```

`configure` will warn for missing dependencies
and we also need `libgd` to build `memusagestat` for its graphical components,
which is an optional dependency, so no warning is raised.
We must also use `patchelf` later.

```
$ sudo apt install gawk libgd-dev patchelf
```

You may need additional dependencies if `configure` complains about something,
and adjust to fit your package manager.
With a successful `configure` we can compile it all.
(Just compiling the malloc directory fails for some dependency)

```
$ make
```

### Run memusagestat

```
$ cd build/x86_64
$ malloc/memusagestat path/to/bazel.mem
fish: Job 1, 'malloc/memusagestat ~/gits/llvm…' terminated by signal SIGSEGV (Address boundary error)
```

This is an interesting crash,
and `gdb` does not help us either.

```
$ malloc/memusagestat path/to/bazel.mem
(gdb) start
Temporary breakpoint 2 at 0x2440: file memusagestat.c, line 120.
Starting program: /home/nils/bin/gits/glibc/build/x86_64/malloc/memusagestat --help
During startup program terminated with signal SIGSEGV, Segmentation fault.
```

So the program crashes before we reach `main`.
and before we reach `_start` [the code before main].

```
(gdb) starti
Starting program: /home/nils/bin/gits/glibc/build/x86_64/malloc/memusagestat --help
During startup program terminated with signal SIGSEGV, Segmentation fault.
```

So the problem lies in the `execve` path:

```
$ strace malloc/memusagestat --help
execve("malloc/memusagestat", ["malloc/memusagestat", "--help"], 0x7fffc627fc38 /* 43 vars */) = -1 ENOENT (No such file or directory)
strace: exec: No such file or directory
```

Some file is missing.
This error is often raised when the program itself is missing,
which is patently untrue.
The shell gets no other information than `ENOENT` error from the kernel,
so the usually correct error message is printed.
But in this case something else is missing.

```
$ file ./malloc/memusagestat
./malloc/memusagestat: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked,
interpreter /.../build/x86_64/../prefix/lib/ld-linux-x86-64.so.2,
BuildID[sha1]=74f9d6bd198b4d8fa5d92ba0629dca2f4994f2cf,
for GNU/Linux 3.2.0, with debug_info, not stripped
```

Aha! This is an interpreted file that wants `ld` to start
As we compiled with a safety prefix it does not use the system `ld`.
We can restore that:

```
$ patchelf --set-interpreter /usr/lib64/ld-linux-x86-64.so.2 malloc/memusagestat
```

This does it! We can now run and instrument `memusagestat`.


[the code before main]: https://embeddedartistry.com/blog/2019/04/08/a-general-overview-of-what-happens-before-main/

### Patch memusagestat

```
diff --git a/malloc/memusagestat.c b/malloc/memusagestat.c
index a1ee5cfacd..fa318622ea 100644
--- a/malloc/memusagestat.c
+++ b/malloc/memusagestat.c
@@ -32,6 +32,7 @@
 #include <stdint.h>
 #include <sys/param.h>
 #include <sys/stat.h>
+#include <inttypes.h>

 #include <gd.h>
 #include <gdfontl.h>
@@ -223,6 +224,15 @@ main (int argc, char *argv[])
       write (fd, headent, 2 * sizeof (struct entry));
     }

+  printf("                 : %zu\n", headent[0].heap);
+  printf("maxsize_total    : %zu\n", headent[0].stack);
+  printf("maxsize time_low : %d\n",  headent[0].time_low);
+  printf("maxsize time_high: %d\n",  headent[0].time_high);
+  printf("maxsize_heap     : %zu\n", headent[1].heap);
+  printf("maxsize_stack    : %zu\n", headent[1].stack);
+  printf("        time_low : %d\n",  headent[1].time_low);
+  printf("        time_high: %d\n",  headent[1].time_high);
+
   if (also_total)
     {
       /* We use one scale and since we also draw the total amount of
@@ -376,6 +386,16 @@ main (int argc, char *argv[])

           now = ((uint64_t) entry.time_high) << 32 | entry.time_low;

+          printf(
+            "%" PRIu64 ": (%" PRIu64 ", %" PRIu64 ", %" PRIu32 ", %" PRIu32 " (%" PRIu64 "))\n",
+            cnt - 1,
+            entry.heap,
+            entry.stack,
+            entry.time_low,
+            entry.time_high,
+            now
+          );
+
           if ((((previously - start_time) * 100) / total_time) % 10 < 5)
             gdImageFilledRectangle (im_out,
                                     40 + ((cnt - 1) * (xsize - 80)) / total,
```

This shows each entry in the binary file,
heap, stack, lower 32 bits of the time and the higher,
as well as the joined time within parentheses
The heap and stack are sent as unsigned 64 bit values, but the time is split in two.

```
build/x86_64 $ malloc/memusagestat ~/gits/llvm-project/utils/bazel/bazel.mem | head
                 : 0
maxsize_total    : 820500
maxsize time_low : 195332156
maxsize time_high: 2385035
maxsize_heap     : 813433
maxsize_stack    : 12752
        time_low : 823673266
        time_high: 2385328
0: (72704, 224, 195398422, 2385035 (10243647520213782))
1: (72768, 0, 195490698, 2385035 (10243647520306058))
...
```

## Parse the binary file in Python

A problem well-stated is half solved,
we now have everything we need.
A good understanding of the problem,
and an oracle implementation to verify our parser directly.
This is a job for [struct]:

```
FORMAT = "QQII"  # u64, u64, u32, u32
SIZE = struct.calcsize(FORMAT)

data = open(sys.argv[1], 'rb').read()
slice = data[ n*SIZE : n*SIZE + SIZE ]
parts = struct.unpack(FORMAT, slice)
heap, stack, low, high = parts
time = entry.time_high << 32 | entry.time_low
```

Our `memusagestat` parser and plotter is [available on github]
and can draw prettier images:

![memusage stat in python](/img/memusagestat-python-reproduction.png)

We have currently implemented the most important subset of the API,
to be a drop-in replacement,
but there are some missing pieces.

Below is a slight modification
where the stack usage is shown to the same scale as the heap.
To show its insignificance for Bazel.

![single scale stack usage](/img/memusagestat-python-single-scale.png)

[available on github]: https://github.com/meroton/plot-memusage

[struct]: https://docs.python.org/3.8/library/struct.html
