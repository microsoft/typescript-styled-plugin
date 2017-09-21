"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript/lib/tsserverlibrary");
var vscode_css_languageservice_1 = require("vscode-css-languageservice");
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
var wrapperPre = ':root{\n';
var VscodeLanguageServiceAdapter = (function () {
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
        var items = this.languageService.doComplete(doc, this.positionInDoc(position), stylesheet);
        return translateCompletionItems(items);
    };
    VscodeLanguageServiceAdapter.prototype.getQuickInfoAtPosition = function (contents, position, context) {
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = this.languageService.parseStylesheet(doc);
        var hover = this.languageService.doHover(doc, this.positionInDoc(position), stylesheet);
        if (hover) {
            return this.translateHover(hover, this.positionInDoc(position), context);
        }
        return undefined;
    };
    VscodeLanguageServiceAdapter.prototype.getSemanticDiagnostics = function (contents, context) {
        var _this = this;
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = this.languageService.parseStylesheet(doc);
        return this.languageService.doValidation(doc, stylesheet).map(function (diag) {
            _this._logger('xxxxxx' + doc.offsetAt(diag.range.start) + ' ' +
                (doc.offsetAt(diag.range.start) - wrapperPre.length));
            var start = doc.offsetAt(diag.range.start) - wrapperPre.length;
            return translateDiagnostic(diag, context.node.getSourceFile(), start, doc.offsetAt(diag.range.end) - wrapperPre.length - start);
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
        var startOffset = context.node.getStart() + 1;
        var startPosition = this._helper.getLineAndChar(context.fileName, context.node.getStart());
        contents = "" + wrapperPre + contents + "}";
        return {
            uri: 'untitled://embedded.css',
            languageId: 'css',
            version: 1,
            getText: function () { return contents; },
            positionAt: function (offset) {
                var pos = context.toPosition(offset - wrapperPre.length);
                return {
                    line: pos.line + 1,
                    character: pos.character,
                };
            },
            offsetAt: function (p) {
                return context.toOffset({
                    line: p.line - 1,
                    character: p.character,
                }) + wrapperPre.length;
            },
            lineCount: contents.split(/n/g).length + 1,
        };
    };
    VscodeLanguageServiceAdapter.prototype.positionInDoc = function (position) {
        return {
            line: position.line + 1,
            character: position.character,
        };
    };
    VscodeLanguageServiceAdapter.prototype.positionWithinContents = function (position) {
        return {
            line: position.line - 1,
            character: position.character,
        };
    };
    VscodeLanguageServiceAdapter.prototype.translateHover = function (hover, position, context) {
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
        var start = context.toOffset(this.positionWithinContents(hover.range ? hover.range.start : position));
        return {
            kind: ts.ScriptElementKind.unknown,
            kindModifiers: '',
            textSpan: {
                start: start,
                length: hover.range ? context.toOffset(this.positionWithinContents(hover.range.end)) - start : 1,
            },
            displayParts: [],
            documentation: contents,
            tags: [],
        };
    };
    return VscodeLanguageServiceAdapter;
}());
exports.VscodeLanguageServiceAdapter = VscodeLanguageServiceAdapter;
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
//# sourceMappingURL=vscode-language-service-adapter.js.map