"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript/lib/tsserverlibrary");
var nodes_1 = require("./nodes");
var StandardTemplateContext = /** @class */ (function () {
    function StandardTemplateContext(fileName, node, helper) {
        this.fileName = fileName;
        this.node = node;
        this.helper = helper;
    }
    StandardTemplateContext.prototype.toOffset = function (location) {
        var startPosition = this.helper.getLineAndChar(this.fileName, this.node.getStart());
        return this.helper.getOffset(this.fileName, location.line + startPosition.line, location.line === 0 ? startPosition.character + location.character : location.character);
    };
    return StandardTemplateContext;
}());
function relative(from, to) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}
var LanguageServiceProxyBuilder = /** @class */ (function () {
    function LanguageServiceProxyBuilder(languageService, helper, templateStringService, tagCondition) {
        var _this = this;
        this.languageService = languageService;
        this.helper = helper;
        this.templateStringService = templateStringService;
        this.tagCondition = tagCondition;
        this._wrappers = [];
        if (templateStringService.getCompletionsAtPosition) {
            var call_1 = templateStringService.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', function (delegate) {
                return function (fileName, position) {
                    var node = _this.getTemplateNode(fileName, position);
                    if (!node) {
                        return delegate(fileName, position);
                    }
                    var contents = node.getText().slice(1, -1);
                    return call_1.call(templateStringService, contents, _this.relativeLC(fileName, node, position), new StandardTemplateContext(fileName, node, _this.helper));
                };
            });
        }
        if (templateStringService.getQuickInfoAtPosition) {
            var call_2 = templateStringService.getQuickInfoAtPosition;
            this.wrap('getQuickInfoAtPosition', function (delegate) {
                return function (fileName, position) {
                    var node = _this.getTemplateNode(fileName, position);
                    if (!node) {
                        return delegate(fileName, position);
                    }
                    var contents = node.getText().slice(1, -1);
                    var quickInfo = call_2.call(templateStringService, contents, _this.relativeLC(fileName, node, position), new StandardTemplateContext(fileName, node, _this.helper));
                    if (quickInfo) {
                        return Object.assign({}, quickInfo, { start: quickInfo.start + node.getStart() });
                    }
                    return undefined;
                };
            });
        }
        if (templateStringService.getSemanticDiagnostics) {
            var call_3 = templateStringService.getSemanticDiagnostics;
            this.wrap('getSemanticDiagnostics', function (delegate) {
                return function (fileName) {
                    var baseDiagnostics = delegate(fileName);
                    var templateDiagnostics = [];
                    for (var _i = 0, _a = _this.getAllTemplateNodes(fileName); _i < _a.length; _i++) {
                        var templateNode = _a[_i];
                        var contents = templateNode.getText().slice(1, -1);
                        var diagnostics = call_3.call(templateStringService, contents, new StandardTemplateContext(fileName, templateNode, _this.helper));
                        for (var _b = 0, diagnostics_1 = diagnostics; _b < diagnostics_1.length; _b++) {
                            var diagnostic = diagnostics_1[_b];
                            templateDiagnostics.push(Object.assign({}, diagnostic, {
                                start: templateNode.getStart() + (diagnostic.start || 0) + 1,
                            }));
                        }
                    }
                    return baseDiagnostics.concat(templateDiagnostics);
                };
            });
        }
    }
    LanguageServiceProxyBuilder.prototype.build = function () {
        var _this = this;
        var ret = this.languageService;
        this._wrappers.forEach(function (_a) {
            var name = _a.name, wrapper = _a.wrapper;
            ret[name] = wrapper(_this.languageService[name]);
        });
        return ret;
    };
    LanguageServiceProxyBuilder.prototype.wrap = function (name, wrapper) {
        this._wrappers.push({ name: name, wrapper: wrapper });
        return this;
    };
    LanguageServiceProxyBuilder.prototype.relativeLC = function (fileName, withinNode, offset) {
        var baseLC = this.helper.getLineAndChar(fileName, withinNode.getStart());
        var cursorLC = this.helper.getLineAndChar(fileName, offset);
        return relative(baseLC, cursorLC);
    };
    LanguageServiceProxyBuilder.prototype.getTemplateNode = function (fileName, position) {
        var node = this.helper.getNode(fileName, position);
        if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return undefined;
        }
        if (!this.tagCondition || nodes_1.isTagged(node, this.tagCondition)) {
            return node;
        }
        return undefined;
    };
    LanguageServiceProxyBuilder.prototype.getAllTemplateNodes = function (fileName) {
        var _this = this;
        return this.helper.getAllNodes(fileName, function (node) {
            return node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
                && (!_this.tagCondition || nodes_1.isTagged(node, _this.tagCondition));
        });
    };
    return LanguageServiceProxyBuilder;
}());
exports.LanguageServiceProxyBuilder = LanguageServiceProxyBuilder;
function createTemplateStringLanguageServiceProxy(languageService, helper, templateStringService, tagCondition) {
    return new LanguageServiceProxyBuilder(languageService, helper, templateStringService, tagCondition).build();
}
exports.createTemplateStringLanguageServiceProxy = createTemplateStringLanguageServiceProxy;
//# sourceMappingURL=language-service-proxy-builder.js.map