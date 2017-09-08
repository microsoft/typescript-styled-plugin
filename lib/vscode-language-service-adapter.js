"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript/lib/tsserverlibrary");
var nodes_1 = require("./ts-util/nodes");
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
    VscodeLanguageServiceAdapter.prototype.getCompletionAtPosition = function (delegate, fileName, position) {
        var node = this._helper.getNode(fileName, position);
        if (!node || node.kind !== 13 /* NoSubstitutionTemplateLiteral */) {
            return delegate(fileName, position);
        }
        var baseLC = this._helper.getLineAndChar(fileName, node.getStart());
        var cursorLC = this._helper.getLineAndChar(fileName, position);
        var relativeLC = relative(baseLC, cursorLC);
        var cssLanguageService = this.languageService;
        var doc = this.createTextDocumentForTemplateString(fileName, node);
        var stylesheet = cssLanguageService.parseStylesheet(doc);
        var items = cssLanguageService.doComplete(doc, relativeLC, stylesheet);
        return translateCompletionItems(items);
    };
    VscodeLanguageServiceAdapter.prototype.getQuickInfoAtPosition = function (delegate, fileName, position) {
        var node = this._helper.getNode(fileName, position);
        if (!node || node.kind !== 13 /* NoSubstitutionTemplateLiteral */) {
            return delegate(fileName, position);
        }
        var baseLC = this._helper.getLineAndChar(fileName, node.getStart());
        var cursorLC = this._helper.getLineAndChar(fileName, position);
        var relativeLC = relative(baseLC, cursorLC);
        var cssLanguageService = this.languageService;
        var doc = this.createTextDocumentForTemplateString(fileName, node);
        var stylesheet = cssLanguageService.parseStylesheet(doc);
        var hover = cssLanguageService.doHover(doc, relativeLC, stylesheet);
        return translateHover(hover, position, 1);
    };
    VscodeLanguageServiceAdapter.prototype.getSemanticDiagnostics = function (delegate, fileName) {
        var _this = this;
        var errors = delegate(fileName) || [];
        var allTemplateStringNodes = this._helper.getAllNodes(fileName, function (n) { return n.kind === 13 /* NoSubstitutionTemplateLiteral */; });
        var nodes = allTemplateStringNodes.filter(function (n) {
            if (!_this._tagCondition)
                return true;
            return nodes_1.isTagged(n, _this._tagCondition);
        });
        var cssLanguageService = this.languageService;
        var diagonosticsList = nodes.map(function (node) {
            var doc = _this.createTextDocumentForTemplateString(fileName, node);
            var stylesheet = cssLanguageService.parseStylesheet(doc);
            return cssLanguageService.doValidation(doc, stylesheet);
        });
        var result = errors.slice();
        diagonosticsList.forEach(function (diagnostics, i) {
            var node = nodes[i];
            var nodeLC = _this._helper.getLineAndChar(fileName, node.getStart());
            var sourceFile = node.getSourceFile();
            for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
                var d = diagnostics_1[_i];
                var sl = nodeLC.line + d.range.start.line;
                var sc = d.range.start.line ?
                    d.range.start.character
                    : nodeLC.character + d.range.start.character;
                var el = nodeLC.line + d.range.end.line;
                var ec = d.range.end.line ? d.range.end.character : nodeLC.character + d.range.end.character;
                var start = ts.getPositionOfLineAndCharacter(sourceFile, sl, sc);
                var end = ts.getPositionOfLineAndCharacter(sourceFile, el, ec);
                result.push(translateDiagnostic(d, sourceFile, start, end - start));
            }
        });
        return result;
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
    VscodeLanguageServiceAdapter.prototype.createTextDocumentForTemplateString = function (fileName, node) {
        var _this = this;
        var text = node.getText().slice(1, -1);
        var startOffset = node.getStart() + 1;
        var startPosition = this._helper.getLineAndChar(fileName, node.getStart());
        return {
            uri: 'untitled://embedded.css',
            languageId: 'css',
            version: 1,
            getText: function () { return text; },
            positionAt: function (offset) {
                var docPosition = _this._helper.getLineAndChar(fileName, startOffset + offset);
                return relative(startPosition, docPosition);
            },
            offsetAt: function (p) {
                var line = startPosition.line + p.line;
                var character = p.line === 0 ? startPosition.character + p.character : p.character;
                return _this._helper.getOffset(fileName, line, character) - startOffset;
            },
            lineCount: text.split(/n/g).length + 1,
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