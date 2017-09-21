import * as ts from 'typescript/lib/tsserverlibrary';
import { ScriptSourceHelper } from '../vscode-language-service-adapter';
import { isTagged } from './nodes';
import {
    Position,
} from 'vscode-languageserver-types';
import { TsCssPluginConfiguration } from '../configuration';
import Logger from '../logger';

export type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export interface TemplateContext {
    fileName: string;

    node: ts.Node;

    /**
     * Map a location from within the template string to an offset within the template string
     */
    toOffset(location: ts.LineAndCharacter): number;

    /**
     * Map an offset within the template string to a location within the template string
     */
    toPosition(offset: number): Position;
}

class StandardTemplateContext implements TemplateContext {
    constructor(
        public readonly fileName: string,
        public readonly node: ts.Node,
        private readonly helper: ScriptSourceHelper,
    ) { }

    toOffset(location: ts.LineAndCharacter): number {
        const startPosition = this.helper.getLineAndChar(this.fileName, this.node.getStart());
        const docOffset = this.helper.getOffset(this.fileName,
            location.line + startPosition.line,
            location.line === 0 ? startPosition.character + location.character : location.character);
        return docOffset - this.node.getStart() - 1;
    }

    toPosition(offset: number): Position {
        const startPosition = this.helper.getLineAndChar(this.fileName, this.node.getStart());
        const startOffset = this.node.getStart() + 1;
        const docPosition = this.helper.getLineAndChar(this.fileName, startOffset + offset);
        return relative(startPosition, docPosition);
    }
}

function relative(from: ts.LineAndCharacter, to: ts.LineAndCharacter) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}

export interface TemplateStringLanguageService {
    getCompletionsAtPosition?(
        contents: string,
        position: ts.LineAndCharacter,
        context: TemplateContext,
    ): ts.CompletionInfo;

    getQuickInfoAtPosition?(
        contents: string,
        position: ts.LineAndCharacter,
        context: TemplateContext,
    ): ts.QuickInfo | undefined;

    getSemanticDiagnostics?(
        contents: string,
        context: TemplateContext,
    ): ts.Diagnostic[];
}

export class LanguageServiceProxyBuilder {

    private _wrappers: any[] = [];

    constructor(
        private readonly languageService: ts.LanguageService,
        private readonly helper: ScriptSourceHelper,
        private readonly templateStringService: TemplateStringLanguageService,
        private readonly logger: Logger,
        private readonly configuration: TsCssPluginConfiguration,
    ) {
        if (templateStringService.getCompletionsAtPosition) {
            const call = templateStringService.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', delegate =>
                (fileName: string, position: number) => {
                    const node = this.getTemplateNode(fileName, position);
                    if (!node) {
                        return delegate(fileName, position);
                    }
                    const contents = node.getText().slice(1, -1);
                    return call.call(templateStringService,
                        contents,
                        this.relativeLC(fileName, node, position),
                        new StandardTemplateContext(fileName, node, this.helper));
                });
        }

        if (templateStringService.getQuickInfoAtPosition) {
            const call = templateStringService.getQuickInfoAtPosition;
            this.wrap('getQuickInfoAtPosition', delegate =>
                (fileName: string, position: number): ts.QuickInfo => {
                    const node = this.getTemplateNode(fileName, position);
                    if (!node) {
                        return delegate(fileName, position);
                    }
                    const contents = node.getText().slice(1, -1);
                    const quickInfo: ts.QuickInfo | undefined = call.call(templateStringService,
                        contents,
                        this.relativeLC(fileName, node, position),
                        new StandardTemplateContext(fileName, node, this.helper));
                    if (quickInfo) {
                        return Object.assign({}, quickInfo, {
                            textSpan:  {
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
            this.wrap('getSemanticDiagnostics', delegate =>
                (fileName: string) => {
                    const baseDiagnostics = delegate(fileName);
                    const templateDiagnostics: ts.Diagnostic[] = [];
                    for (const templateNode of this.getAllTemplateNodes(fileName)) {
                        const contents = templateNode.getText().slice(1, -1);
                        const diagnostics: ts.Diagnostic[] = call.call(templateStringService,
                            contents,
                            new StandardTemplateContext(fileName, templateNode, this.helper));

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

    build() {
        const ret: any = this.languageService;
        this._wrappers.forEach(({ name, wrapper }) => {
            ret[name] = wrapper((this.languageService as any)[name]);
        });
        return ret;
    }

    private wrap<K extends keyof ts.LanguageService>(name: K, wrapper: LanguageServiceMethodWrapper<K>) {
        this._wrappers.push({ name, wrapper });
        return this;
    }

    private relativeLC(fileName: string, withinNode: ts.Node, offset: number) {
        const baseLC = this.helper.getLineAndChar(fileName, withinNode.getStart());
        const cursorLC = this.helper.getLineAndChar(fileName, offset);
        return relative(baseLC, cursorLC);
    }

    private getTemplateNode(fileName: string, position: number): ts.Node | undefined {
        const node = this.helper.getNode(fileName, position);
        if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return undefined;
        }

        if (isTagged(node, this.configuration.tags)) {
            return node;
        }
        return undefined;
    }

    private getAllTemplateNodes(fileName: string): ts.Node[] {
        return this.helper.getAllNodes(fileName, node =>
            node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral && isTagged(node, this.configuration.tags));
    }
}

export function createTemplateStringLanguageServiceProxy(
    languageService: ts.LanguageService,
    helper: ScriptSourceHelper,
    templateStringService: TemplateStringLanguageService,
    logger: Logger,
    configuration: TsCssPluginConfiguration,
): ts.LanguageService {
    return new LanguageServiceProxyBuilder(
        languageService, helper, templateStringService, logger, configuration).build();
}
