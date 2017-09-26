# TypeScript Styled Plugin (Prototype)

Prototype TypeScript server plugin that adds intellisense to styled component css strings

![](documentation/preview.gif)


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



## Credits

Code originally forked from: https://github.com/Quramy/ts-graphql-plugin