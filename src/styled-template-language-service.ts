// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import { getSCSSLanguageService, getCSSLanguageService, Stylesheet, LanguageService } from 'vscode-css-languageservice';
import * as vscode from 'vscode-languageserver-types';
import * as config from './config';
import { TsStyledPluginConfiguration } from './configuration';
import { TemplateLanguageService, TemplateContext } from 'typescript-template-language-service-decorator';

const wrapperPre = ':root{\n';

export default class StyledTemplateLanguageService implements TemplateLanguageService {

    // private _cssLanguageService?: LanguageService;
    private _scssLanguageService?: LanguageService;

    constructor(
        private readonly typescript: typeof ts,
        private readonly configuration: TsStyledPluginConfiguration
    ) { }

    // private get cssLanguageService(): LanguageService {
    //     if (!this._cssLanguageService) {
    //         this._cssLanguageService = getCSSLanguageService();
    //         this._cssLanguageService.configure(this.configuration);
    //     }
    //     return this._cssLanguageService;
    // }

    private get scssLanguageService(): LanguageService {
        if (!this._scssLanguageService) {
            this._scssLanguageService = getSCSSLanguageService();
            this._scssLanguageService.configure(this.configuration);
        }
        return this._scssLanguageService;
    }

    public getCompletionsAtPosition(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.CompletionInfo {
        const doc = this.createVirtualDocument(context);
        const stylesheet = this.scssLanguageService.parseStylesheet(doc);
        const items = this.scssLanguageService.doComplete(doc, this.toVirtualDocPosition(position), stylesheet);
        return translateCompletionItems(this.typescript, items);
    }

    public getQuickInfoAtPosition(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.QuickInfo | undefined {
        const doc = this.createVirtualDocument(context);
        const stylesheet = this.scssLanguageService.parseStylesheet(doc);
        const hover = this.scssLanguageService.doHover(doc, this.toVirtualDocPosition(position), stylesheet);
        if (hover) {
            return this.translateHover(hover, this.toVirtualDocPosition(position), context);
        }
        return undefined;
    }

    public getSemanticDiagnostics(
        context: TemplateContext
    ): ts.Diagnostic[] {
        const doc = this.createVirtualDocument(context);
        const stylesheet = this.scssLanguageService.parseStylesheet(doc);
        return this.translateDiagnostics(
            this.scssLanguageService.doValidation(doc, stylesheet),
            doc,
            context,
            context.text).filter(x => !!x) as ts.Diagnostic[];
    }

    private createVirtualDocument(
        context: TemplateContext
    ): vscode.TextDocument {
        const contents = `${wrapperPre}${context.text}\n}`;
        return {
            uri: 'untitled://embedded.scss',
            languageId: 'scss',
            version: 1,
            getText: () => contents,
            positionAt: (offset: number) => {
                const pos = context.toPosition(this.fromVirtualDocOffset(offset));
                return this.toVirtualDocPosition(pos);
            },
            offsetAt: (p: vscode.Position) => {
                const offset = context.toOffset(this.fromVirtualDocPosition(p));
                return this.toVirtualDocOffset(offset);
            },
            lineCount: contents.split(/n/g).length + 1,
        };
    }

    private toVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter {
        return {
            line: position.line + 1,
            character: position.character,
        };
    }

    private fromVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter {
        return {
            line: position.line - 1,
            character: position.character,
        };
    }

    private toVirtualDocOffset(offset: number) {
        return offset + wrapperPre.length;
    }

    private fromVirtualDocOffset(offset: number) {
        return offset - wrapperPre.length;
    }

    private translateDiagnostics(
        diagnostics: vscode.Diagnostic[],
        doc: vscode.TextDocument,
        context: TemplateContext,
        content: string
    ) {
        const sourceFile = context.node.getSourceFile();
        return diagnostics.map(diag =>
            this.translateDiagnostic(diag, sourceFile, doc, context, content));
    }

    private translateDiagnostic(
        diagnostic: vscode.Diagnostic,
        file: ts.SourceFile,
        doc: vscode.TextDocument,
        context: TemplateContext,
        content: string
    ): ts.Diagnostic | undefined {
        // Make sure returned error is within the real document
        if (diagnostic.range.start.line === 0
            || diagnostic.range.start.line > doc.lineCount
            || diagnostic.range.start.character >= content.length
        ) {
            return undefined;
        }

        const start = context.toOffset(this.fromVirtualDocPosition(diagnostic.range.start));
        const length = context.toOffset(this.fromVirtualDocPosition(diagnostic.range.end)) - start;
        const code = typeof diagnostic.code === 'number' ? diagnostic.code : 9999;
        return {
            code,
            messageText: diagnostic.message,
            category: translateSeverity(this.typescript, diagnostic.severity),
            file,
            start,
            length,
            source: config.pluginName,
        };
    }

    private translateHover(
        hover: vscode.Hover,
        position: ts.LineAndCharacter,
        context: TemplateContext
    ): ts.QuickInfo {
        const contents: ts.SymbolDisplayPart[] = [];
        const convertPart = (hoverContents: typeof hover.contents) => {
            if (typeof hoverContents === 'string') {
                contents.push({ kind: 'unknown', text: hoverContents });
            } else if (Array.isArray(hoverContents)) {
                hoverContents.forEach(convertPart);
            } else {
                contents.push({ kind: 'unknown', text: hoverContents.value });
            }
        };
        convertPart(hover.contents);
        const start = context.toOffset(this.fromVirtualDocPosition(hover.range ? hover.range.start : position));
        return {
            kind: this.typescript.ScriptElementKind.unknown,
            kindModifiers: '',
            textSpan: {
                start,
                length: hover.range ? context.toOffset(this.fromVirtualDocPosition(hover.range.end)) - start : 1,
            },
            displayParts: [],
            documentation: contents,
            tags: [],
        };
    }
}

function translateCompletionItems(
    typescript: typeof ts,
    items: vscode.CompletionList
): ts.CompletionInfo {
    return {
        isGlobalCompletion: false,
        isMemberCompletion: false,
        isNewIdentifierLocation: false,
        entries: items.items.map(x => translateCompetionEntry(typescript, x)),
    };
}

function translateCompetionEntry(
    typescript: typeof ts,
    item: vscode.CompletionItem
): ts.CompletionEntry {
    return {
        name: item.label,
        kindModifiers: 'declare',
        kind: item.kind ? translateionCompletionItemKind(typescript, item.kind) : typescript.ScriptElementKind.unknown,
        sortText: '0',
    };
}

function translateionCompletionItemKind(
    typescript: typeof ts,
    kind: vscode.CompletionItemKind
): ts.ScriptElementKind {
    switch (kind) {
        case vscode.CompletionItemKind.Method:
            return typescript.ScriptElementKind.memberFunctionElement;
        case vscode.CompletionItemKind.Function:
            return typescript.ScriptElementKind.functionElement;
        case vscode.CompletionItemKind.Constructor:
            return typescript.ScriptElementKind.constructorImplementationElement;
        case vscode.CompletionItemKind.Field:
        case vscode.CompletionItemKind.Variable:
            return typescript.ScriptElementKind.variableElement;
        case vscode.CompletionItemKind.Class:
            return typescript.ScriptElementKind.classElement;
        case vscode.CompletionItemKind.Interface:
            return typescript.ScriptElementKind.interfaceElement;
        case vscode.CompletionItemKind.Module:
            return typescript.ScriptElementKind.moduleElement;
        case vscode.CompletionItemKind.Property:
            return typescript.ScriptElementKind.memberVariableElement;
        case vscode.CompletionItemKind.Unit:
        case vscode.CompletionItemKind.Value:
            return typescript.ScriptElementKind.constElement;
        case vscode.CompletionItemKind.Enum:
            return typescript.ScriptElementKind.enumElement;
        case vscode.CompletionItemKind.Keyword:
            return typescript.ScriptElementKind.keyword;
        case vscode.CompletionItemKind.Color:
            return typescript.ScriptElementKind.constElement;
        case vscode.CompletionItemKind.Reference:
            return typescript.ScriptElementKind.alias;
        case vscode.CompletionItemKind.File:
            return typescript.ScriptElementKind.moduleElement;
        case vscode.CompletionItemKind.Snippet:
        case vscode.CompletionItemKind.Text:
        default:
            return typescript.ScriptElementKind.unknown;
    }
}

function translateSeverity(
    typescript: typeof ts,
    severity: vscode.DiagnosticSeverity | undefined
): ts.DiagnosticCategory {
    switch (severity) {
        case vscode.DiagnosticSeverity.Information:
        case vscode.DiagnosticSeverity.Hint:
            return typescript.DiagnosticCategory.Message;

        case vscode.DiagnosticSeverity.Warning:
            return typescript.DiagnosticCategory.Warning;

        case vscode.DiagnosticSeverity.Error:
        default:
            return typescript.DiagnosticCategory.Error;
    }
}