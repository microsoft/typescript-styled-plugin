"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript/lib/tsserverlibrary");
const nodes_1 = require("./nodes");
class StandardTemplateContext {
    constructor(fileName, node, helper) {
        this.fileName = fileName;
        this.node = node;
        this.helper = helper;
    }
    toOffset(position) {
        const docOffset = this.helper.getOffset(this.fileName, position.line + this.stringBodyPosition.line, position.line === 0 ? this.stringBodyPosition.character + position.character : position.character);
        return docOffset - this.stringBodyOffset;
    }
    toPosition(offset) {
        const docPosition = this.helper.getLineAndChar(this.fileName, this.stringBodyOffset + offset);
        return relative(this.stringBodyPosition, docPosition);
    }
    get stringBodyOffset() {
        return this.node.getStart() + 1;
    }
    get stringBodyPosition() {
        return this.helper.getLineAndChar(this.fileName, this.stringBodyOffset);
    }
}
function relative(from, to) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}
class TemplateLanguageServiceProxyBuilder {
    constructor(helper, templateStringService, logger, tags) {
        this.helper = helper;
        this.templateStringService = templateStringService;
        this.logger = logger;
        this.tags = tags;
        this._wrappers = [];
        if (templateStringService.getCompletionsAtPosition) {
            const call = templateStringService.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', delegate => (fileName, position) => {
                const node = this.getTemplateNode(fileName, position);
                if (!node) {
                    return delegate(fileName, position);
                }
                const contents = node.getText().slice(1, -1);
                return call.call(templateStringService, contents, this.getRelativePositionWithinNode(fileName, node, position), new StandardTemplateContext(fileName, node, this.helper));
            });
        }
        if (templateStringService.getQuickInfoAtPosition) {
            const call = templateStringService.getQuickInfoAtPosition;
            this.wrap('getQuickInfoAtPosition', delegate => (fileName, position) => {
                const node = this.getTemplateNode(fileName, position);
                if (!node) {
                    return delegate(fileName, position);
                }
                const contents = node.getText().slice(1, -1);
                const quickInfo = call.call(templateStringService, contents, this.getRelativePositionWithinNode(fileName, node, position), new StandardTemplateContext(fileName, node, this.helper));
                if (quickInfo) {
                    return Object.assign({}, quickInfo, {
                        textSpan: {
                            start: quickInfo.textSpan.start + node.getStart() + 1,
                            length: quickInfo.textSpan.length
                        }
                    });
                }
                return delegate(fileName, position);
            });
        }
        if (templateStringService.getSemanticDiagnostics) {
            const call = templateStringService.getSemanticDiagnostics.bind(templateStringService);
            this.wrap('getSemanticDiagnostics', delegate => (fileName) => {
                return this.adapterDiagnosticsCall(delegate, call, fileName);
            });
        }
        if (templateStringService.getSyntacticDiagnostics) {
            const call = templateStringService.getSyntacticDiagnostics.bind(templateStringService);
            this.wrap('getSyntacticDiagnostics', delegate => (fileName) => {
                return this.adapterDiagnosticsCall(delegate, call, fileName);
            });
        }
    }
    build(languageService) {
        const ret = languageService;
        this._wrappers.forEach(({ name, wrapper }) => {
            ret[name] = wrapper(languageService[name]);
        });
        return ret;
    }
    wrap(name, wrapper) {
        this._wrappers.push({ name, wrapper });
        return this;
    }
    getRelativePositionWithinNode(fileName, node, offset) {
        const baseLC = this.helper.getLineAndChar(fileName, node.getStart() + 1);
        const cursorLC = this.helper.getLineAndChar(fileName, offset);
        return relative(baseLC, cursorLC);
    }
    getTemplateNode(fileName, position) {
        const node = this.helper.getNode(fileName, position);
        if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return undefined;
        }
        if (nodes_1.isTagged(node, this.tags)) {
            return node;
        }
        return undefined;
    }
    getAllTemplateNodes(fileName) {
        return this.helper.getAllNodes(fileName, node => node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral && nodes_1.isTagged(node, this.tags));
    }
    adapterDiagnosticsCall(delegate, implementation, fileName) {
        const baseDiagnostics = delegate(fileName);
        const templateDiagnostics = [];
        for (const templateNode of this.getAllTemplateNodes(fileName)) {
            const contents = templateNode.getText().slice(1, -1);
            const diagnostics = implementation(contents, new StandardTemplateContext(fileName, templateNode, this.helper));
            for (const diagnostic of diagnostics) {
                templateDiagnostics.push(Object.assign({}, diagnostic, {
                    start: templateNode.getStart() + 1 + (diagnostic.start || 0),
                }));
            }
        }
        return [...baseDiagnostics, ...templateDiagnostics];
    }
}
/**
 *
 */
function createTemplateStringLanguageServiceProxy(languageService, helper, templateStringService, logger, tags) {
    return new TemplateLanguageServiceProxyBuilder(helper, templateStringService, logger, tags)
        .build(languageService);
}
exports.createTemplateStringLanguageServiceProxy = createTemplateStringLanguageServiceProxy;
//# sourceMappingURL=template-string-language-service-proxy.js.map