# Non-deterministic Builds

Builds should be deterministic, if the inputs are unchanged they should produce the same output. In Bazel terminology this is often refered to as builds being hermetic, i.e. fully self enclosed with regards to its inputs.

This is sometimes not the case, and in those instances your system might produce different artifacts when run with the same inputs.

There are several reasons why this could happen

- An unspecified input that has been changed
- A result which is based on random chance or statistical behavior
- Timestamps or a wall time dependency

Different reasons will have different methods of resolution. It is in general an error for a build to produce different results with the same input, however, the most common consequence of this error is a build performance penalty.

If you can't fully eliminate non-determinism in your builds you should strive to avoid it and make sure that the consequence are only minor build performance detriments.

## Automatic Detection of Non-Deterministic Actions

By rerunning a small subset of your actions and checking the output the build system can detect non-determinism. We rerun the actions with a small delay to automatically detect if that action would result in different outputs.

This is not guaranteed to catch every instance of non-determinism, but is a great filter for most of them.

## Sample Rate

Sample Rate determines the fraction of actions that will be rerun. The default value is 0 (off) which won't generate any reports. The recommended value is 1% but it can be set up to 100% (rerun all actions).

## Timestamped Outputs

One common reason for non-determinism is timestamped outputs. Some part of the build process adds the current wall time to the output.

Common fixes for this problem is to either set the date/time value to something predictable like the current commit time or a redacted value

```console
$ gcc input.c -Wno-builtin-macro-redefined -D__TIME__="REDACTED" -D__DATE__="REDACTED" -D__TIMESTAMP__="REDACTED"
```

The exact method will depend on your build tool.

The periodicity of the timestamp might vary. In order to be able to timestamps which are not very granular the rerun actions are by default run with a 60 second delay. This allows us to detect timestamps with an `HH:mm` format.

## Do not Rerun Expensive Actions

By default we only rerun actions which were completed within 10 seconds, this allows us to avoid rerunning very expensive actions. In most builds the vast majority of actions are completed in a fraction of a second.

This value can be modified or unset in order to allow any action to be rerun. NOTE: If the action takes longer than the rerun delay they will be scheduled after the action has been completed.

## Actions with Inherently Random Output

Some actions can by design have random output. If possible we recommend to seed the RNG with a known random value which is supplied as an input. Doing this tells bazel not to expect different runs with different seeds to have the same output.
