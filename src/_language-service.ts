// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import { Logger, TemplateContext, TemplateLanguageService } from 'typescript-template-language-service-decorator';
import * as ts from 'typescript/lib/tsserverlibrary';
import { getCSSLanguageService, getSCSSLanguageService, LanguageService, FoldingRange } from 'vscode-css-languageservice';
import { doComplete as emmetDoComplete } from 'vscode-emmet-helper';
import * as vscode from 'vscode-languageserver-types';
import * as config from './_config';
import { ConfigurationManager } from './_configuration';
import { VirtualDocumentProvider } from './_virtual-document-provider';
import { TextDocument } from 'vscode-languageserver-textdocument';


const cssErrorCode = 9999;

function arePositionsEqual(
    left: ts.LineAndCharacter,
    right: ts.LineAndCharacter
): boolean {
    return left.line === right.line && left.character === right.character;
}

function isAfter(
    left: vscode.Position,
    right: vscode.Position
): boolean {
    return right.line > left.line || (right.line === left.line && right.character >= left.character);
}

function overlaps(
    a: vscode.Range,
    b: vscode.Range
): boolean {
    return !isAfter(a.end, b.start) && !isAfter(b.end, a.start);
}

const emptyCompletionList: vscode.CompletionList = {
    items: [],
    isIncomplete: false,
};

class CompletionsCache {
    private _cachedCompletionsFile?: string;
    private _cachedCompletionsPosition?: ts.LineAndCharacter;
    private _cachedCompletionsContent?: string;
    private _completions?: vscode.CompletionList;

    public getCached(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): vscode.CompletionList | undefined {
        if (this._completions
            && context.fileName === this._cachedCompletionsFile
            && this._cachedCompletionsPosition && arePositionsEqual(position, this._cachedCompletionsPosition)
            && context.text === this._cachedCompletionsContent
        ) {
            return this._completions;
        }

        return undefined;
    }

    public updateCached(
        context: TemplateContext,
        position: ts.LineAndCharacter,
        completions: vscode.CompletionList
    ) {
        this._cachedCompletionsFile = context.fileName;
        this._cachedCompletionsPosition = position;
        this._cachedCompletionsContent = context.text;
        this._completions = completions;
    }
}

export class StyledTemplateLanguageService implements TemplateLanguageService {
    private _cssLanguageService?: LanguageService;
    private _scssLanguageService?: LanguageService;
    private _completionsCache = new CompletionsCache();

    constructor(
        private readonly typescript: typeof ts,
        private readonly configurationManager: ConfigurationManager,
        private readonly virtualDocumentFactory: VirtualDocumentProvider,
        private readonly logger: Logger // tslint:disable-line
    ) {
        configurationManager.onUpdatedConfig(() => {
            if (this._cssLanguageService) {
                this._cssLanguageService.configure(this.configurationManager.config);
            }
            if (this._scssLanguageService) {
                this._scssLanguageService.configure(this.configurationManager.config);
            }
        });
    }

    private get cssLanguageService(): LanguageService {
        if (!this._cssLanguageService) {
            this._cssLanguageService = getCSSLanguageService();
            this._cssLanguageService.configure(this.configurationManager.config);
        }
        return this._cssLanguageService;
    }

    private get scssLanguageService(): LanguageService {
        if (!this._scssLanguageService) {
            this._scssLanguageService = getSCSSLanguageService();
            this._scssLanguageService.configure(this.configurationManager.config);
        }
        return this._scssLanguageService;
    }

    public getCompletionsAtPosition(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.WithMetadata<ts.CompletionInfo> {
        const items = this.getCompletionItems(context, position);
        const doc = this.virtualDocumentFactory.createVirtualDocument(context);
        const wrapper = this.virtualDocumentFactory.getVirtualDocumentWrapper(context);
        return translateCompletionItemsToCompletionInfo(this.typescript, items, doc, wrapper);
    }

    public getCompletionEntryDetails(
        context: TemplateContext,
        position: ts.LineAndCharacter,
        name: string
    ): ts.CompletionEntryDetails {
        const item = this.getCompletionItems(context, position).items.find(x => x.label === name);
        if (!item) {
            return {
                name,
                kind: this.typescript.ScriptElementKind.unknown,
                kindModifiers: '',
                tags: [],
                displayParts: toDisplayParts(name),
                documentation: [],
            };
        }
        return translateCompletionItemsToCompletionEntryDetails(this.typescript, item);
    }

    public getQuickInfoAtPosition(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.QuickInfo | undefined {
        const doc = this.virtualDocumentFactory.createVirtualDocument(context);
        const stylesheet = this.scssLanguageService.parseStylesheet(doc);
        const hover = this.scssLanguageService.doHover(doc, this.virtualDocumentFactory.toVirtualDocPosition(position), stylesheet);
        if (hover) {
            return this.translateHover(hover, this.virtualDocumentFactory.toVirtualDocPosition(position), context);
        }
        return undefined;
    }

    public getSemanticDiagnostics(
        context: TemplateContext
    ): ts.Diagnostic[] {
        const doc = this.virtualDocumentFactory.createVirtualDocument(context);
        const stylesheet = this.scssLanguageService.parseStylesheet(doc);
        return this.translateDiagnostics(
            this.scssLanguageService.doValidation(doc, stylesheet),
            doc,
            context,
            context.text).filter(x => !!x) as ts.Diagnostic[];
    }

    public getSupportedCodeFixes(): number[] {
        return [cssErrorCode];
    }

    public getCodeFixesAtPosition(
        context: TemplateContext,
        start: number,
        end: number,
        // _errorCodes: number[],
        // _format: ts.FormatCodeSettings
    ): ts.CodeAction[] {
        const doc = this.virtualDocumentFactory.createVirtualDocument(context);
        const stylesheet = this.scssLanguageService.parseStylesheet(doc);
        const range = this.toVsRange(context, start, end);
        const diagnostics = this.scssLanguageService.doValidation(doc, stylesheet)
            .filter(diagnostic => overlaps(diagnostic.range, range));

        return this.translateCodeActions(
            context,
            this.scssLanguageService.doCodeActions(doc, range, { diagnostics }, stylesheet));
    }

    public getOutliningSpans(
        context: TemplateContext
    ): ts.OutliningSpan[] {
        const doc = this.virtualDocumentFactory.createVirtualDocument(context);
        const ranges = this.scssLanguageService.getFoldingRanges(doc);
        return ranges
            .filter(range => {
                // Filter out ranges outside on last line
                const end = context.toOffset({
                    line: range.endLine,
                    character: range.endCharacter || 0,
                });
                return end < context.text.length;
            })
            .map(range => this.translateOutliningSpan(context, range));
    }

    private toVsRange(
        context: TemplateContext,
        start: number,
        end: number
    ): vscode.Range {
        return {
            start: this.virtualDocumentFactory.toVirtualDocPosition(context.toPosition(start)),
            end: this.virtualDocumentFactory.toVirtualDocPosition(context.toPosition(end)),
        };
    }

    private getCompletionItems(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): vscode.CompletionList {
        const cached = this._completionsCache.getCached(context, position);
        const completions: vscode.CompletionList = {
            isIncomplete: false,
            items: [],
        };

        if (cached) {
            return cached;
        }

        /**
         * This would happen if a ` is triggered causing VSCode to open up two ``. At this stage completions aren't needed
         * but they are still requested.
         * Due to the fact there's nothing to complete (empty template) the language servers below end up requesting everything,
         * causing a 3-4 second delay. When a template string is opened up we should do nothing and return an empty list.
         *
         * Also fixes: https://github.com/styled-components/vscode-styled-components/issues/276
         **/
        if (context.node.getText() === '``') {
            return completions;
        }

        const doc = this.virtualDocumentFactory.createVirtualDocument(context);
        const virtualPosition = this.virtualDocumentFactory.toVirtualDocPosition(position);
        const stylesheet = this.scssLanguageService.parseStylesheet(doc);
        this.cssLanguageService.setCompletionParticipants([]);
        const emmetResults = emmetDoComplete(doc, virtualPosition, 'css', this.configurationManager.config.emmet) || emptyCompletionList;
        const completionsCss = this.cssLanguageService.doComplete(doc, virtualPosition, stylesheet) || emptyCompletionList;
        const completionsScss = this.scssLanguageService.doComplete(doc, virtualPosition, stylesheet) || emptyCompletionList;
        completionsScss.items = filterScssCompletionItems(completionsScss.items);

        completions.items = [...completionsCss.items, ...completionsScss.items];
        if (emmetResults.items.length) {
            completions.items.push(...emmetResults.items);
            completions.isIncomplete = true;
        }
        this._completionsCache.updateCached(context, position, completions);
        return completions;
    }

    private translateDiagnostics(
        diagnostics: vscode.Diagnostic[],
        doc: TextDocument,
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
        doc: TextDocument,
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

        const start = context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition(diagnostic.range.start));
        const length = context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition(diagnostic.range.end)) - start;
        const code = typeof diagnostic.code === 'number' ? diagnostic.code : cssErrorCode;
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
        const start = context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition(hover.range ? hover.range.start : position));
        return {
            kind: this.typescript.ScriptElementKind.unknown,
            kindModifiers: '',
            textSpan: {
                start,
                length: hover.range ? context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition(hover.range.end)) - start : 1,
            },
            displayParts: [],
            documentation: contents,
            tags: [],
        };
    }

    private translateCodeActions(
        context: TemplateContext,
        codeActions: vscode.Command[]
    ): ts.CodeAction[] {
        const actions: ts.CodeAction[] = [];
        for (const vsAction of codeActions) {
            if (vsAction.command !== '_css.applyCodeAction') {
                continue;
            }

            const edits = vsAction.arguments && vsAction.arguments[2] as vscode.TextEdit[];
            if (edits) {
                actions.push({
                    description: vsAction.title,
                    changes: edits.map(edit => this.translateTextEditToFileTextChange(context, edit)),
                });
            }
        }
        return actions;
    }

    private translateTextEditToFileTextChange(
        context: TemplateContext,
        textEdit: vscode.TextEdit
    ): ts.FileTextChanges {
        const start = context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition(textEdit.range.start));
        const end = context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition(textEdit.range.end));
        return {
            fileName: context.fileName,
            textChanges: [{
                newText: textEdit.newText,
                span: {
                    start,
                    length: end - start,
                },
            }],
        };
    }

    private translateOutliningSpan(
        context: TemplateContext,
        range: FoldingRange
    ): ts.OutliningSpan {
        const startOffset = context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition({ line: range.startLine, character: range.startCharacter || 0 }));
        const endOffset = context.toOffset(this.virtualDocumentFactory.fromVirtualDocPosition({ line: range.endLine, character: range.endCharacter || 0 }));
        const span = {
            start: startOffset,
            length: endOffset - startOffset,
        };

        return {
            autoCollapse: false,
            kind: this.typescript.OutliningSpanKind.Code,
            bannerText: '',
            textSpan: span,
            hintSpan: span,
        };
    }
}

function filterScssCompletionItems(
    items: vscode.CompletionItem[]
): vscode.CompletionItem[] {
    return items.filter(item => (item.kind === vscode.CompletionItemKind.Function && item.label.substr(0, 1) === ':'));
}

function translateCompletionItemsToCompletionInfo(
    typescript: typeof ts,
    items: vscode.CompletionList,
    doc: TextDocument,
    wrapper: string
): ts.WithMetadata<ts.CompletionInfo> {
    return {
        metadata: {
            isIncomplete: items.isIncomplete,
        },
        isGlobalCompletion: false,
        isIncomplete: items.isIncomplete || undefined,
        isMemberCompletion: false,
        isNewIdentifierLocation: false,
        entries: items.items.map(x => translateCompetionEntry(typescript, x, doc, wrapper)),
    };
}

function translateCompletionItemsToCompletionEntryDetails(
    typescript: typeof ts,
    item: vscode.CompletionItem
): ts.CompletionEntryDetails {
    return {
        name: item.label,
        kind: item.kind ? translateCompletionItemKind(typescript, item.kind) : typescript.ScriptElementKind.unknown,
        kindModifiers: getKindModifiers(item),
        displayParts: toDisplayParts(item.detail),
        documentation: toDisplayParts(item.documentation),
        tags: [],
    };
}

function translateCompetionEntry(
    typescript: typeof ts,
    item: vscode.CompletionItem,
    doc: TextDocument,
    wrapper: string
): ts.CompletionEntry {
    return {
        name: item.label,
        kind: item.kind ? translateCompletionItemKind(typescript, item.kind) : typescript.ScriptElementKind.unknown,
        kindModifiers: getKindModifiers(item),
        sortText: item.sortText || item.label,
        replacementSpan: {
            // The correct offset for start seems to be the range.start minus the wrapper
            start: doc.offsetAt((item as any).textEdit.range.start) - wrapper.length,
            length: doc.offsetAt((item as any).textEdit.range.end) - doc.offsetAt((item as any).textEdit.range.start),
        },
    };
}

function translateCompletionItemKind(
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

function getKindModifiers(item: vscode.CompletionItem): string {
    if (item.kind === vscode.CompletionItemKind.Color) {
        return 'color';
    }
    return '';
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

function toDisplayParts(
    text: string | vscode.MarkupContent | undefined
): ts.SymbolDisplayPart[] {
    if (!text) {
        return [];
    }
    return [{
        kind: 'text',
        text: typeof text === 'string' ? text : text.value,
    }];
}
