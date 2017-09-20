"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript/lib/tsserverlibrary");
var vscode_css_languageservice_1 = require("vscode-css-languageservice");
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
var VscodeLanguageServiceAdapter = /** @class */ (function () {
    function VscodeLanguageServiceAdapter(_helper, opt) {
        if (opt === void 0) { opt = {}; }
        this._helper = _helper;
        this._logger = function () { };
        if (opt.logger) {
            this._logger = opt.logger;
        }
    }
    VscodeLanguageServiceAdapter.prototype.getCompletionsAtPosition = function (contents, position, context) {
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = this.languageService.parseStylesheet(doc);
        var items = this.languageService.doComplete(doc, position, stylesheet);
        return translateCompletionItems(items);
    };
    VscodeLanguageServiceAdapter.prototype.getQuickInfoAtPosition = function (contents, position, context) {
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = this.languageService.parseStylesheet(doc);
        var hover = this.languageService.doHover(doc, position, stylesheet);
        if (hover) {
            return translateHover(hover, position, context);
        }
        return undefined;
    };
    VscodeLanguageServiceAdapter.prototype.getSemanticDiagnostics = function (contents, context) {
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = this.languageService.parseStylesheet(doc);
        return this.languageService.doValidation(doc, stylesheet).map(function (diag) {
            var start = doc.offsetAt(diag.range.start);
            return translateDiagnostic(diag, context.node.getSourceFile(), start, doc.offsetAt(diag.range.end) - start);
        });
    };
    Object.defineProperty(VscodeLanguageServiceAdapter.prototype, "languageService", {
        get: function () {
            if (!this._languageService) {
                this._languageService = vscode_css_languageservice_1.getCSSLanguageService();
            }
            return this._languageService;
        },
        enumerable: true,
        configurable: true
    });
    VscodeLanguageServiceAdapter.prototype.createTextDocumentForTemplateString = function (contents, context) {
        var _this = this;
        var startOffset = context.node.getStart() + 1;
        var startPosition = this._helper.getLineAndChar(context.fileName, context.node.getStart());
        return {
            uri: 'untitled://embedded.css',
            languageId: 'css',
            version: 1,
            getText: function () { return contents; },
            positionAt: function (offset) {
                var docPosition = _this._helper.getLineAndChar(context.fileName, startOffset + offset);
                return relative(startPosition, docPosition);
            },
            offsetAt: function (p) {
                var line = startPosition.line + p.line;
                var character = p.line === 0 ? startPosition.character + p.character : p.character;
                return _this._helper.getOffset(context.fileName, line, character) - startOffset;
            },
            lineCount: contents.split(/n/g).length + 1,
        };
    };
    return VscodeLanguageServiceAdapter;
}());
exports.VscodeLanguageServiceAdapter = VscodeLanguageServiceAdapter;
function relative(from, to) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}
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
        case vscode_languageserver_types_1.CompletionItemKind.Method:
            return ts.ScriptElementKind.memberFunctionElement;
        case vscode_languageserver_types_1.CompletionItemKind.Function:
            return ts.ScriptElementKind.functionElement;
        case vscode_languageserver_types_1.CompletionItemKind.Constructor:
            return ts.ScriptElementKind.constructorImplementationElement;
        case vscode_languageserver_types_1.CompletionItemKind.Field:
        case vscode_languageserver_types_1.CompletionItemKind.Variable:
            return ts.ScriptElementKind.variableElement;
        case vscode_languageserver_types_1.CompletionItemKind.Class:
            return ts.ScriptElementKind.classElement;
        case vscode_languageserver_types_1.CompletionItemKind.Interface:
            return ts.ScriptElementKind.interfaceElement;
        case vscode_languageserver_types_1.CompletionItemKind.Module:
            return ts.ScriptElementKind.moduleElement;
        case vscode_languageserver_types_1.CompletionItemKind.Property:
            return ts.ScriptElementKind.memberVariableElement;
        case vscode_languageserver_types_1.CompletionItemKind.Unit:
        case vscode_languageserver_types_1.CompletionItemKind.Value:
            return ts.ScriptElementKind.constElement;
        case vscode_languageserver_types_1.CompletionItemKind.Enum:
            return ts.ScriptElementKind.enumElement;
        case vscode_languageserver_types_1.CompletionItemKind.Keyword:
            return ts.ScriptElementKind.keyword;
        case vscode_languageserver_types_1.CompletionItemKind.Color:
            return ts.ScriptElementKind.constElement;
        case vscode_languageserver_types_1.CompletionItemKind.Reference:
            return ts.ScriptElementKind.alias;
        case vscode_languageserver_types_1.CompletionItemKind.File:
            return ts.ScriptElementKind.moduleElement;
        case vscode_languageserver_types_1.CompletionItemKind.Snippet:
        case vscode_languageserver_types_1.CompletionItemKind.Text:
        default:
            return ts.ScriptElementKind.unknown;
    }
}
function translateDiagnostic(d, file, start, length) {
    var code = typeof d.code === 'number' ? d.code : 9999;
    var messageText = d.message.split('\n')[0];
    return {
        code: code,
        messageText: messageText,
        category: d.severity,
        file: file,
        start: start,
        length: length,
        source: 'ts-css',
    };
}
function translateHover(hover, position, context) {
    var contents = [];
    var convertPart = function (hoverContents) {
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
    var start = context.toOffset(hover.range ? hover.range.start : position);
    return {
        kind: ts.ScriptElementKind.unknown,
        kindModifiers: '',
        textSpan: {
            start: start,
            length: hover.range ? context.toOffset(hover.range.end) - start : 1,
        },
        displayParts: [],
        documentation: contents,
        tags: [],
    };
}
//# sourceMappingURL=vscode-language-service-adapter.js.map