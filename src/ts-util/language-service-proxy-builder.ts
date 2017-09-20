import * as ts from 'typescript/lib/tsserverlibrary';
import { ScriptSourceHelper } from '../vscode-language-service-adapter';
import { isTagged, TagCondition } from './nodes';
import {
    Position,
} from 'vscode-languageserver-types';

export type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export interface TemplateContext {
    fileName: string;
    node: ts.Node;
    toOffset(location: ts.LineAndCharacter): number;
}

class StandardTemplateContext implements TemplateContext {
    constructor(
        public readonly fileName: string,
        public readonly node: ts.Node,
        private readonly helper: ScriptSourceHelper,
    ) { }

    toOffset(location: ts.LineAndCharacter): number {
        const startPosition = this.helper.getLineAndChar(this.fileName, this.node.getStart());
        return this.helper.getOffset(this.fileName,
            location.line + startPosition.line,
            location.line === 0 ? startPosition.character + location.character : location.character);
    }
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

function relative(from: ts.LineAndCharacter, to: ts.LineAndCharacter) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}

export class LanguageServiceProxyBuilder {

    private _wrappers: any[] = [];

    constructor(
        private readonly _info: ts.server.PluginCreateInfo,
        private readonly helper: ScriptSourceHelper,
        private readonly adapter: TemplateStringLanguageService,
        private _tagCondition?: TagCondition,
    ) {
        if (adapter.getCompletionsAtPosition) {
            const call = adapter.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', delegate =>
                (fileName: string, position: number) => {
                    const node = this.helper.getNode(fileName, position);
                    if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
                        return delegate(fileName, position);
                    }
                    const baseLC = this.helper.getLineAndChar(fileName, node.getStart());
                    const cursorLC = this.helper.getLineAndChar(fileName, position);
                    const relativeLC = relative(baseLC, cursorLC);
                    const contents = node.getText().slice(1, -1);
                    return call.call(adapter, contents, relativeLC,
                        new StandardTemplateContext(fileName, node, this.helper));
                });
        }

        if (adapter.getQuickInfoAtPosition) {
            const call = adapter.getQuickInfoAtPosition;
            this.wrap('getQuickInfoAtPosition', delegate =>
                (fileName: string, position: number) => {
                    const node = this.helper.getNode(fileName, position);
                    if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
                        return delegate(fileName, position);
                    }
                    const baseLC = this.helper.getLineAndChar(fileName, node.getStart());
                    const cursorLC = this.helper.getLineAndChar(fileName, position);
                    const relativeLC = relative(baseLC, cursorLC);
                    const contents = node.getText().slice(1, -1);
                    const quickInfo = call.call(adapter, contents, relativeLC,
                            new StandardTemplateContext(fileName, node, this.helper));
                    if (quickInfo) {
                        return Object.assign({}, quickInfo, { start: quickInfo.start +  node.getStart() } );
                    }
                    return undefined;
                });
        }

        if (adapter.getSemanticDiagnostics) {
            const call = adapter.getSemanticDiagnostics;
            this.wrap('getSemanticDiagnostics', delegate =>
                (fileName: string) => {
                    const errors = delegate(fileName) || [];
                    const allTemplateStringNodes = this.helper.getAllNodes(
                        fileName,
                        (n: ts.Node) => n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral);

                    const nodes = allTemplateStringNodes.filter(n => {
                        return true;
                        // return isTagged(n, this._tagCondition);
                    });
                    const diagonosticsList: ts.Diagnostic[][] = nodes.map(node => {
                        const baseLC = this.helper.getLineAndChar(fileName, node.getStart());
                        const contents = node.getText().slice(1, -1);
                        return call.call(adapter, contents, new StandardTemplateContext(fileName, node, this.helper));
                    });
                    const result: ts.Diagnostic[] = [];
                    diagonosticsList.forEach((diagnostics, i) => {
                        const node = nodes[i];
                        const nodeLC = this.helper.getLineAndChar(fileName, node.getStart());
                        const sourceFile = node.getSourceFile();
                        for (const d of diagnostics) {
                            result.push(Object.assign({}, d, { start: node.getStart() + (d.start || 0) + 1 }));
                        }
                    });

                    return [...errors, ...result];
                });
        }
    }

    build() {
        const ret: any = this._info.languageService;
        this._wrappers.forEach(({ name, wrapper }) => {
            ret[name] = wrapper((this._info.languageService as any)[name], this._info);
        });
        return ret;
    }

    private wrap<K extends keyof ts.LanguageService>(name: K, wrapper: LanguageServiceMethodWrapper<K>) {
        this._wrappers.push({ name, wrapper });
        return this;
    }
}
