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
    toOffset(location) {
        const startPosition = this.helper.getLineAndChar(this.fileName, this.node.getStart());
        const docOffset = this.helper.getOffset(this.fileName, location.line + startPosition.line, location.line === 0 ? startPosition.character + location.character : location.character);
        return docOffset - this.node.getStart() - 1;
    }
    toPosition(offset) {
        const startPosition = this.helper.getLineAndChar(this.fileName, this.node.getStart());
        const startOffset = this.node.getStart() + 1;
        const docPosition = this.helper.getLineAndChar(this.fileName, startOffset + offset);
        return relative(startPosition, docPosition);
    }
}
function relative(from, to) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}
class TemplateLanguageServiceProxyBuilder {
    constructor(helper, templateStringService, logger, configuration) {
        this.helper = helper;
        this.templateStringService = templateStringService;
        this.logger = logger;
        this.configuration = configuration;
        this._wrappers = [];
        if (templateStringService.getCompletionsAtPosition) {
            const call = templateStringService.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', delegate => (fileName, position) => {
                const node = this.getTemplateNode(fileName, position);
                if (!node) {
                    return delegate(fileName, position);
                }
                const contents = node.getText().slice(1, -1);
                return call.call(templateStringService, contents, this.relativeLC(fileName, node, position), new StandardTemplateContext(fileName, node, this.helper));
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
                const quickInfo = call.call(templateStringService, contents, this.relativeLC(fileName, node, position), new StandardTemplateContext(fileName, node, this.helper));
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
            const call = templateStringService.getSemanticDiagnostics;
            this.wrap('getSemanticDiagnostics', delegate => (fileName) => {
                const baseDiagnostics = delegate(fileName);
                const templateDiagnostics = [];
                for (const templateNode of this.getAllTemplateNodes(fileName)) {
                    const contents = templateNode.getText().slice(1, -1);
                    const diagnostics = call.call(templateStringService, contents, new StandardTemplateContext(fileName, templateNode, this.helper));
                    for (const diagnostic of diagnostics) {
                        templateDiagnostics.push(Object.assign({}, diagnostic, {
                            start: templateNode.getStart() + (diagnostic.start || 0) + 1,
                        }));
                    }
                }
                return [...baseDiagnostics, ...templateDiagnostics];
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
    relativeLC(fileName, withinNode, offset) {
        const baseLC = this.helper.getLineAndChar(fileName, withinNode.getStart());
        const cursorLC = this.helper.getLineAndChar(fileName, offset);
        return relative(baseLC, cursorLC);
    }
    getTemplateNode(fileName, position) {
        const node = this.helper.getNode(fileName, position);
        if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return undefined;
        }
        if (nodes_1.isTagged(node, this.configuration.tags)) {
            return node;
        }
        return undefined;
    }
    getAllTemplateNodes(fileName) {
        return this.helper.getAllNodes(fileName, node => node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral && nodes_1.isTagged(node, this.configuration.tags));
    }
}
/**
 *
 */
function createTemplateStringLanguageServiceProxy(languageService, helper, templateStringService, logger, configuration) {
    return new TemplateLanguageServiceProxyBuilder(helper, templateStringService, logger, configuration)
        .build(languageService);
}
exports.createTemplateStringLanguageServiceProxy = createTemplateStringLanguageServiceProxy;
//# sourceMappingURL=template-language-service-proxy.js.map