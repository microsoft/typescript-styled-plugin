"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript/lib/tsserverlibrary");
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const vscode = require("vscode-languageserver-types");
const config = require("./config");
const wrapperPre = ':root{\n';
class VscodeLanguageServiceAdapter {
    constructor(configuration) {
        this.configuration = configuration;
    }
    get languageService() {
        if (!this._languageService) {
            this._languageService = vscode_css_languageservice_1.getCSSLanguageService();
            this._languageService.configure(this.configuration);
        }
        return this._languageService;
    }
    getCompletionsAtPosition(contents, position, context) {
        const doc = this.createVirtualDocument(contents, context);
        const stylesheet = this.languageService.parseStylesheet(doc);
        const items = this.languageService.doComplete(doc, this.toVirtualDocPosition(position), stylesheet);
        return translateCompletionItems(items);
    }
    getQuickInfoAtPosition(contents, position, context) {
        const doc = this.createVirtualDocument(contents, context);
        const stylesheet = this.languageService.parseStylesheet(doc);
        const hover = this.languageService.doHover(doc, this.toVirtualDocPosition(position), stylesheet);
        if (hover) {
            return this.translateHover(hover, this.toVirtualDocPosition(position), context);
        }
        return undefined;
    }
    getSemanticDiagnostics(contents, context) {
        const doc = this.createVirtualDocument(contents, context);
        const stylesheet = this.languageService.parseStylesheet(doc);
        return this.translateDiagnostics(this.languageService.doValidation(doc, stylesheet), doc, context);
    }
    createVirtualDocument(contents, context) {
        contents = `${wrapperPre}${contents}}`;
        return {
            uri: 'untitled://embedded.css',
            languageId: 'css',
            version: 1,
            getText: () => contents,
            positionAt: (offset) => {
                const pos = context.toPosition(this.fromVirtualDocOffset(offset));
                return this.toVirtualDocPosition(pos);
            },
            offsetAt: (p) => {
                const offset = context.toOffset(this.fromVirtualDocPosition(p));
                return this.toVirtualDocOffset(offset);
            },
            lineCount: contents.split(/n/g).length + 1,
        };
    }
    toVirtualDocPosition(position) {
        return {
            line: position.line + 1,
            character: position.character,
        };
    }
    fromVirtualDocPosition(position) {
        return {
            line: position.line - 1,
            character: position.character,
        };
    }
    toVirtualDocOffset(offset) {
        return offset + wrapperPre.length;
    }
    fromVirtualDocOffset(offset) {
        return offset - wrapperPre.length;
    }
    translateDiagnostics(diagnostics, doc, context) {
        const sourceFile = context.node.getSourceFile();
        return diagnostics.map(diag => this.translateDiagnostic(diag, sourceFile, doc));
    }
    translateDiagnostic(diagnostic, file, doc) {
        const start = this.fromVirtualDocOffset(doc.offsetAt(diagnostic.range.start));
        const length = this.fromVirtualDocOffset(doc.offsetAt(diagnostic.range.end)) - start;
        const code = typeof diagnostic.code === 'number' ? diagnostic.code : 9999;
        return {
            code,
            messageText: diagnostic.message,
            category: translateSeverity(diagnostic.severity),
            file,
            start,
            length,
            source: config.pluginName,
        };
    }
    translateHover(hover, position, context) {
        const contents = [];
        const convertPart = (hoverContents) => {
            if (typeof hoverContents === 'string') {
                contents.push({ kind: 'unknown', text: hoverContents });
            }
            else if (Array.isArray(hoverContents)) {
                hoverContents.forEach(convertPart);
            }
            else {
                contents.push({ kind: 'unknown', text: hoverContents.value });
            }
        };
        convertPart(hover.contents);
        const start = context.toOffset(this.fromVirtualDocPosition(hover.range ? hover.range.start : position));
        return {
            kind: ts.ScriptElementKind.unknown,
            kindModifiers: '',
            textSpan: {
                start,
                length: hover.range ? context.toOffset(this.fromVirtualDocPosition(hover.range.end)) - start : 1,
            },
            displayParts: [],
            documentation: contents,
            tags: [],
        };
    }
}
exports.default = VscodeLanguageServiceAdapter;
function translateCompletionItems(items) {
    return {
        isGlobalCompletion: false,
        isMemberCompletion: false,
        isNewIdentifierLocation: false,
        entries: items.items.map(translateCompetionEntry),
    };
}
function translateCompetionEntry(item) {
    return {
        name: item.label,
        kindModifiers: 'declare',
        kind: item.kind ? translateionCompletionItemKind(item.kind) : ts.ScriptElementKind.unknown,
        sortText: '0',
    };
}
function translateionCompletionItemKind(kind) {
    switch (kind) {
        case vscode.CompletionItemKind.Method:
            return ts.ScriptElementKind.memberFunctionElement;
        case vscode.CompletionItemKind.Function:
            return ts.ScriptElementKind.functionElement;
        case vscode.CompletionItemKind.Constructor:
            return ts.ScriptElementKind.constructorImplementationElement;
        case vscode.CompletionItemKind.Field:
        case vscode.CompletionItemKind.Variable:
            return ts.ScriptElementKind.variableElement;
        case vscode.CompletionItemKind.Class:
            return ts.ScriptElementKind.classElement;
        case vscode.CompletionItemKind.Interface:
            return ts.ScriptElementKind.interfaceElement;
        case vscode.CompletionItemKind.Module:
            return ts.ScriptElementKind.moduleElement;
        case vscode.CompletionItemKind.Property:
            return ts.ScriptElementKind.memberVariableElement;
        case vscode.CompletionItemKind.Unit:
        case vscode.CompletionItemKind.Value:
            return ts.ScriptElementKind.constElement;
        case vscode.CompletionItemKind.Enum:
            return ts.ScriptElementKind.enumElement;
        case vscode.CompletionItemKind.Keyword:
            return ts.ScriptElementKind.keyword;
        case vscode.CompletionItemKind.Color:
            return ts.ScriptElementKind.constElement;
        case vscode.CompletionItemKind.Reference:
            return ts.ScriptElementKind.alias;
        case vscode.CompletionItemKind.File:
            return ts.ScriptElementKind.moduleElement;
        case vscode.CompletionItemKind.Snippet:
        case vscode.CompletionItemKind.Text:
        default:
            return ts.ScriptElementKind.unknown;
    }
}
function translateSeverity(severity) {
    switch (severity) {
        case vscode.DiagnosticSeverity.Information:
        case vscode.DiagnosticSeverity.Hint:
            return ts.DiagnosticCategory.Message;
        case vscode.DiagnosticSeverity.Warning:
            return ts.DiagnosticCategory.Warning;
        case vscode.DiagnosticSeverity.Error:
        default:
            return ts.DiagnosticCategory.Error;
    }
}
//# sourceMappingURL=styled-string-language-service.js.map