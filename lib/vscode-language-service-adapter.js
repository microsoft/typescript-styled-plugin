"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vscode_css_languageservice_1 = require("vscode-css-languageservice");
var vscode_languageserver_types_1 = require("vscode-languageserver-types");
var VscodeLanguageServiceAdapter = (function () {
    function VscodeLanguageServiceAdapter(_helper, opt) {
        if (opt === void 0) { opt = {}; }
        this._helper = _helper;
        this._logger = function () { };
        if (opt.logger) {
            this._logger = opt.logger;
        }
        if (opt.tag) {
            this._tagCondition = opt.tag;
        }
    }
    VscodeLanguageServiceAdapter.prototype.getCompletionsAtPosition = function (contents, position, context) {
        var cssLanguageService = this.languageService;
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = cssLanguageService.parseStylesheet(doc);
        var items = cssLanguageService.doComplete(doc, position, stylesheet);
        return translateCompletionItems(items);
    };
    VscodeLanguageServiceAdapter.prototype.getQuickInfoAtPosition = function (contents, position, context) {
        var cssLanguageService = this.languageService;
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = cssLanguageService.parseStylesheet(doc);
        var hover = cssLanguageService.doHover(doc, position, stylesheet);
        if (hover) {
            return translateHover(hover, context.position, 1);
        }
        return undefined;
    };
    VscodeLanguageServiceAdapter.prototype.getSemanticDiagnostics = function (contents, context) {
        var cssLanguageService = this.languageService;
        var doc = this.createTextDocumentForTemplateString(contents, context);
        var stylesheet = cssLanguageService.parseStylesheet(doc);
        var diag = cssLanguageService.doValidation(doc, stylesheet);
        return diag.map(function (x) {
            return translateDiagnostic(x, context.node.getSourceFile(), doc.offsetAt(x.range.start), doc.offsetAt(x.range.end) - doc.offsetAt(x.range.start));
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
        kind: item.kind ? translateionCompletionItemKind(item.kind) : 'unknown',
        sortText: '0',
    };
}
function translateionCompletionItemKind(kind) {
    switch (kind) {
        case vscode_languageserver_types_1.CompletionItemKind.Method:
            return 'method';
        case vscode_languageserver_types_1.CompletionItemKind.Function:
            return 'function';
        case vscode_languageserver_types_1.CompletionItemKind.Constructor:
            return 'constructor';
        case vscode_languageserver_types_1.CompletionItemKind.Field:
        case vscode_languageserver_types_1.CompletionItemKind.Variable:
            return 'variable';
        case vscode_languageserver_types_1.CompletionItemKind.Class:
            return 'class';
        case vscode_languageserver_types_1.CompletionItemKind.Interface:
            return 'interface';
        case vscode_languageserver_types_1.CompletionItemKind.Module:
            return 'module';
        case vscode_languageserver_types_1.CompletionItemKind.Property:
            return 'property';
        case vscode_languageserver_types_1.CompletionItemKind.Unit:
        case vscode_languageserver_types_1.CompletionItemKind.Value:
            return 'const';
        case vscode_languageserver_types_1.CompletionItemKind.Enum:
            return 'enum';
        case vscode_languageserver_types_1.CompletionItemKind.Keyword:
            return 'keyword';
        case vscode_languageserver_types_1.CompletionItemKind.Color:
            return 'const';
        case vscode_languageserver_types_1.CompletionItemKind.Reference:
            return 'alias';
        case vscode_languageserver_types_1.CompletionItemKind.File:
            return 'file';
        case vscode_languageserver_types_1.CompletionItemKind.Snippet:
        case vscode_languageserver_types_1.CompletionItemKind.Text:
        default:
            return 'unknown';
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
function translateHover(hover, start, length) {
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
    return {
        kind: '',
        kindModifiers: '',
        textSpan: { start: start, length: length },
        displayParts: [],
        documentation: contents,
        tags: [],
    };
}
//# sourceMappingURL=vscode-language-service-adapter.js.map