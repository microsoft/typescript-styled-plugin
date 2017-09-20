"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript/lib/tsserverlibrary");
function relative(from, to) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}
var LanguageServiceProxyBuilder = (function () {
    function LanguageServiceProxyBuilder(_info, helper, adapter) {
        var _this = this;
        this._info = _info;
        this.helper = helper;
        this.adapter = adapter;
        this._wrappers = [];
        if (adapter.getCompletionsAtPosition) {
            var call_1 = adapter.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', function (delegate) {
                return function (fileName, position) {
                    var node = _this.helper.getNode(fileName, position);
                    if (!node || node.kind !== 13 /* NoSubstitutionTemplateLiteral */) {
                        return delegate(fileName, position);
                    }
                    var baseLC = _this.helper.getLineAndChar(fileName, node.getStart());
                    var cursorLC = _this.helper.getLineAndChar(fileName, position);
                    var relativeLC = relative(baseLC, cursorLC);
                    var contents = node.getText().slice(1, -1);
                    return call_1.call(adapter, contents, relativeLC, { node: node, fileName: fileName, position: position });
                };
            });
        }
        if (adapter.getQuickInfoAtPosition) {
            var call_2 = adapter.getQuickInfoAtPosition;
            this.wrap('getQuickInfoAtPosition', function (delegate) {
                return function (fileName, position) {
                    var node = _this.helper.getNode(fileName, position);
                    if (!node || node.kind !== 13 /* NoSubstitutionTemplateLiteral */) {
                        return delegate(fileName, position);
                    }
                    var baseLC = _this.helper.getLineAndChar(fileName, node.getStart());
                    var cursorLC = _this.helper.getLineAndChar(fileName, position);
                    var relativeLC = relative(baseLC, cursorLC);
                    var contents = node.getText().slice(1, -1);
                    return call_2.call(adapter, contents, relativeLC, { node: node, fileName: fileName, position: position });
                };
            });
        }
        if (adapter.getSemanticDiagnostics) {
            var call_3 = adapter.getSemanticDiagnostics;
            this.wrap('getSemanticDiagnostics', function (delegate) {
                return function (fileName) {
                    var errors = delegate(fileName) || [];
                    var allTemplateStringNodes = _this.helper.getAllNodes(fileName, function (n) { return n.kind === 13 /* NoSubstitutionTemplateLiteral */; });
                    var nodes = allTemplateStringNodes.filter(function (n) {
                        return true;
                        // return isTagged(n, this._tagCondition);
                    });
                    var diagonosticsList = nodes.map(function (node) {
                        var baseLC = _this.helper.getLineAndChar(fileName, node.getStart());
                        var contents = node.getText().slice(1, -1);
                        return call_3.call(adapter, contents, { node: node, fileName: fileName, position: baseLC });
                    });
                    var result = [];
                    diagonosticsList.forEach(function (diagnostics, i) {
                        var node = nodes[i];
                        var nodeLC = _this.helper.getLineAndChar(fileName, node.getStart());
                        var sourceFile = node.getSourceFile();
                        for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
                            var d = diagnostics_1[_i];
                            result.push(Object.assign({}, d, { start: node.getStart() + d.start + 1 }));
                        }
                    });
                    return errors.concat(result);
                };
            });
        }
    }
    LanguageServiceProxyBuilder.prototype.build = function () {
        var _this = this;
        var ret = this._info.languageService;
        this._wrappers.forEach(function (_a) {
            var name = _a.name, wrapper = _a.wrapper;
            ret[name] = wrapper(_this._info.languageService[name], _this._info);
        });
        return ret;
    };
    LanguageServiceProxyBuilder.prototype.wrap = function (name, wrapper) {
        this._wrappers.push({ name: name, wrapper: wrapper });
        return this;
    };
    return LanguageServiceProxyBuilder;
}());
exports.LanguageServiceProxyBuilder = LanguageServiceProxyBuilder;
//# sourceMappingURL=language-service-proxy-builder.js.map