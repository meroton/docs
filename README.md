# Website

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

### Installation

The required Node.js and npm versions are pinned in `.tool-versions` and enforced
by `devEngines` in `package.json`. Install them with your version manager, for
example [mise](https://mise.jdx.dev/):

```
$ mise install
```

Download all dependencies.
```
$ npm install
```

`.npmrc` sets `min-release-age=7`, so npm will not install packages published in
the last 7 days. This is a supply chain protection and requires npm >= 11.10.0.

### Local Development

```
$ npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

```
$ GIT_USER=<Your GitHub username> USE_SSH=true npm run deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to your `<your organization>.github.io` repository.
