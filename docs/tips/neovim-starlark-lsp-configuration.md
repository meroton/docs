# Configuration LSPs for Bazel Starlark in Neovim

This explains how to setup _linting_ of Starlark in neovim.
Using two important tools: [buildifier] the standard Bazel formatter
as well as the less-known `starlark_lsp` in the [starlark-rust] project,
stemming from Meta's [buck2] build system.
If you use `buck2`
you should instead use `buck2 lsp` for your project,
[it too is available for neovim].

There are _many `(neo)vim` plugins_ to perform code _formatting_,
and they can format BUILD files with `buildifier` just fine.
But, there are fewer good options to leverage `buildifier`'s linting capabilities in `neovim`.

[buck2]: https://buck2.build/
[go-to-definition code]: https://github.com/facebookexperimental/starlark-rust/pulls/100
[Bazel labels]: https://github.com/facebookexperimental/starlark-rust/pulls/101
[starlark-rust]: https://github.com/facebookexperimental/starlark-rust
[buildifier]: https://github.com/bazelbuild/buildtools/blob/master/buildifier/README.md
[efm-langserver]: https://github.com/mattn/efm-langserver
[it too is available for neovim]: https://github.com/neovim/nvim-lspconfig/blob/master/lua/lspconfig/server_configurations/buck2.lua

## Show case

![Starlark warnings](/img/neovim-starlark-lsp.png)

Two warnings in a sample file: the first comes from `buildifier` and the second comes from `starlark_lsp`.

### Many formatting plugins

There are many formatting plugins and frameworks for (neo)vim.
I prefer to run autoformatters in the terminal, so I do not use these.

  https://github.com/google/vim-codefmt  
  https://github.com/vim-autoformat/vim-autoformat  
  https://github.com/sbdchd/neoformat  

Some other plugins can also show lint warnings,
these are doing the same thing in practice,
but I prefer `efm-langserver` which is less of a framework,
and can interact with other IDEs much better.

  https://github.com/dense-analysis/ale  
  https://github.com/jose-elias-alvarez/null-ls.nvim/tree/main (Archived)  

### Neovim's built-in LSP

I use the built-in LSP, which is configured through the [lspconfig repository].
Refer to its documentation for installation.

## Using Buildifier as an LSP server

To fully leverage the linting warnings from `buildifier`,
and integrate it with tools that use LSP diagnostics
it must be made to act as an LSP server.
This is what the `efm-langserver` tool does,
it can convert any classic linter tool to a LSP server with linting capabilities.
This tip explains how to use this in `neovim`,
and later tips will show how to use `efm-langserver` with any IDE.

## Installation

Using the `go` and `rust` toolchains:

```
# buildifier
$ go install github.com/bazelbuild/buildtools/buildifier@latest
# efm-langserver
$ go install github.com/mattn/efm-langserver@latest
# starlark_lsp
$ cargo install starlark
```

`buildifier` and `efm-langserver` are available as statically linked binaries
if you do not want the full language setup for `go`.
You can download them and add them to `$PATH` yourself.

https://github.com/bazelbuild/buildtools/releases/tag/v6.4.0  
https://github.com/mattn/efm-langserver/releases/tag/v0.0.49  

## Configuring Neovim's built-in LSP client

### starlark_lsp

[starlark-rust] is [readily available] in the [lspconfig repository]

```
lspconfig["starlark_rust"].setup {
  -- NB: Temporary flag to enable LSP for bazel workspace.
  -- TODO: This seems to be a long-lived feature flag and we should update the configuration to use it.
  cmd = {"starlark", "--lsp", "--bazel"},
  capabilities = capabilities,
  on_attach = on_attach,
}
```

### Buildifier

[Following the configuration instructions], your lua rc file should look something likes this:

`efm-langserver` can happily lint and format many languages.
This snippet also shows placeholders for `shellcheck` and `dotenv-linter`,
to demonstrate that this easily extends to more and more linters.

```
require "lspconfig".efm.setup {
    init_options = {documentFormatting = true},
    cmd = {"efm-langserver", "--logfile=/tmp/lsp-efm.log", "--loglevel=2"},
    filetypes = {"sh", "bzl", "env"},
    settings = {
        rootMarkers = {".git/"},
        languages = {
            bzl = {
                {
                    lintSource = 'buildifier',
                    lintCommand = 'buildifier -lint=warn -mode=check',
                    lintFormats = {'%f:%l: %m'},
                }
            },
            sh = { ... },
            env = { ... },
        }
    }
}
```

[readily available]: https://github.com/neovim/nvim-lspconfig/blob/master/lua/lspconfig/server_configurations/starlark_rust.lua

[Following the configuration instructions]: https://github.com/mattn/efm-langserver#configuration-for-neovim-builtin-lsp-with-nvim-lspconfig
[lspconfig repository]: https://github.com/neovim/nvim-lspconfig
