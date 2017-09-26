# TypeScript Styled Plugin (Prototype)

TypeScript server plugin that adds intellisense to styled component css strings

![](documentation/preview.gif)

[![Build Status](https://travis-ci.org/Microsoft/typescript-styled-plugin.svg?branch=master)](https://travis-ci.org/Microsoft/typescript-styled-plugin)

## Usage
This plugin requires TypeScript 2.4 or later. It can provide intellisense in both JavaScript and TypeScript files within any editor that uses TypeScript to power their language features. This includes [VS Code](https://code.visualstudio.com), [Visual Studio](https://www.visualstudio.com), [Sublime with the TypeScript plugin](https://github.com/Microsoft/TypeScript-Sublime-Plugin), [Atom with the TypeScript plugin](https://atom.io/packages/atom-typescript), and others. 


To get started, add a `plugins` section to your [`tsconfig.json`](http://www.typescriptlang.org/docs/handbook/tsconfig-json.html) or [`jsconfig.json`](https://code.visualstudio.com/Docs/languages/javascript#_javascript-project-jsconfigjson)

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-styled-plugin"
      }
    ]
  }
}
```

## Contributing

To build the typescript-styled-plugin, you'll need [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/).

First, [fork](https://help.github.com/articles/fork-a-repo/) the typescript-styled-plugin repo and clone :

```bash
git clone https://github.com/Microsoft/typescript-styled-plugin.git
cd typescript-styled-plugin
```

Then install dev dependencies:

```bash
npm install
```

The plugin is written in [TypeScript](http://www.typescriptlang.org). The source code is in the `src/` directory with the compiled JavaScript output to the `lib/` directory. Kick off a build using the `compile` script:

```bash
npm run compile
```

And then run the end to end tests with the `e2e` script:

```bash
npm run e2e
```

Please see also our [Code of Conduct](CODE_OF_CONDUCT.md).


## Credits

Code originally forked from: https://github.com/Quramy/ts-graphql-plugin