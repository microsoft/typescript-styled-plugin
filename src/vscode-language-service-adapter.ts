import * as ts from 'typescript/lib/tsserverlibrary';
import { isTagged, TagCondition } from './ts-util/nodes';
import { getCSSLanguageService, Stylesheet, LanguageService } from 'vscode-css-languageservice';
import {
    TextDocument,
    CompletionList,
    CompletionItem,
    CompletionItemKind,
    Diagnostic,
    Position,
    Hover,
} from 'vscode-languageserver-types';
import { TemplateContext, TemplateStringLanguageService } from './ts-util/language-service-proxy-builder';

export interface LanguageServiceAdapterCreateOptions {
    logger?: (msg: string) => void;
    tag?: string;
}

export interface ScriptSourceHelper {
    getAllNodes: (fileName: string, condition: (n: ts.Node) => boolean) => ts.Node[];
    getNode: (fileName: string, position: number) => ts.Node | undefined;
    getLineAndChar: (fileName: string, position: number) => ts.LineAndCharacter;
    getOffset(fileName: string, line: number, character: number): number;
}

export class VscodeLanguageServiceAdapter implements TemplateStringLanguageService {

    private _tagCondition?: TagCondition;
    private _languageService?: LanguageService;

    constructor(
        private _helper: ScriptSourceHelper,
        opt: LanguageServiceAdapterCreateOptions = {},
    ) {
        if (opt.logger) {
            this._logger = opt.logger;
        }
        if (opt.tag) {
            this._tagCondition = opt.tag;
        }
    }

    getCompletionsAtPosition(
        contents: string,
        position: ts.LineAndCharacter,
        context: TemplateContext,
    ): ts.CompletionInfo {
        const doc = this.createTextDocumentForTemplateString(contents, context);
        const stylesheet = this.languageService.parseStylesheet(doc);
        const items = this.languageService.doComplete(doc, position, stylesheet);
        return translateCompletionItems(items);
    }

    getQuickInfoAtPosition(
        contents: string,
        position: ts.LineAndCharacter,
        context: TemplateContext,
    ): ts.QuickInfo | undefined {
        const doc = this.createTextDocumentForTemplateString(contents, context);
        const stylesheet = this.languageService.parseStylesheet(doc);
        const hover = this.languageService.doHover(doc, position, stylesheet);
        if (hover) {
            return translateHover(hover, position, context);
        }
        return undefined;
    }

    getSemanticDiagnostics?(
        contents: string,
        context: TemplateContext,
    ): ts.Diagnostic[] {
        const doc = this.createTextDocumentForTemplateString(contents, context);
        const stylesheet = this.languageService.parseStylesheet(doc);
        return this.languageService.doValidation(doc, stylesheet).map(diag => {
            const start = doc.offsetAt(diag.range.start);
            return translateDiagnostic(diag, context.node.getSourceFile(), start, doc.offsetAt(diag.range.end) - start);
        });
    }

    private get languageService(): LanguageService {
        if (!this._languageService) {
            this._languageService = getCSSLanguageService();
        }
        return this._languageService;
    }

    private createTextDocumentForTemplateString(
        contents: string,
        context: TemplateContext,
    ): TextDocument {
        const startOffset = context.node.getStart() + 1;
        const startPosition = this._helper.getLineAndChar(context.fileName, context.node.getStart());
        return {
            uri: 'untitled://embedded.css',
            languageId: 'css',
            version: 1,
            getText: () => contents,
            positionAt: (offset: number) => {
                const docPosition = this._helper.getLineAndChar(context.fileName, startOffset + offset);
                return relative(startPosition, docPosition);
            },
            offsetAt: (p: Position) => {
                const line = startPosition.line + p.line;
                const character = p.line === 0 ? startPosition.character + p.character : p.character;
                return this._helper.getOffset(context.fileName, line, character) - startOffset;
            },
            lineCount: contents.split(/n/g).length + 1,
        };
    }

    private _logger: (msg: string) => void = () => { };
}

function relative(from: ts.LineAndCharacter, to: ts.LineAndCharacter) {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}

function translateCompletionItems(items: CompletionList): ts.CompletionInfo {
    return {
        isGlobalCompletion: false,
        isMemberCompletion: false,
        isNewIdentifierLocation: false,
        entries: items.items.map(translateCompetionEntry),
    };
}

function translateCompetionEntry(item: CompletionItem): ts.CompletionEntry {
    return {
        name: item.label,
        kindModifiers: 'declare',
        kind: item.kind ? translateionCompletionItemKind(item.kind) : ts.ScriptElementKind.unknown,
        sortText: '0',
    };
}

function translateionCompletionItemKind(kind: CompletionItemKind): ts.ScriptElementKind {
    switch (kind) {
        case CompletionItemKind.Method:
            return ts.ScriptElementKind.memberFunctionElement;
        case CompletionItemKind.Function:
            return ts.ScriptElementKind.functionElement;
        case CompletionItemKind.Constructor:
            return ts.ScriptElementKind.constructorImplementationElement;
        case CompletionItemKind.Field:
        case CompletionItemKind.Variable:
            return ts.ScriptElementKind.variableElement;
        case CompletionItemKind.Class:
            return ts.ScriptElementKind.classElement;
        case CompletionItemKind.Interface:
            return ts.ScriptElementKind.interfaceElement;
        case CompletionItemKind.Module:
            return ts.ScriptElementKind.moduleElement;
        case CompletionItemKind.Property:
            return ts.ScriptElementKind.memberVariableElement;
        case CompletionItemKind.Unit:
        case CompletionItemKind.Value:
            return ts.ScriptElementKind.constElement;
        case CompletionItemKind.Enum:
            return ts.ScriptElementKind.enumElement;
        case CompletionItemKind.Keyword:
            return ts.ScriptElementKind.keyword;
        case CompletionItemKind.Color:
            return ts.ScriptElementKind.constElement;
        case CompletionItemKind.Reference:
            return ts.ScriptElementKind.alias;
        case CompletionItemKind.File:
            return ts.ScriptElementKind.moduleElement;
        case CompletionItemKind.Snippet:
        case CompletionItemKind.Text:
        default:
            return ts.ScriptElementKind.unknown;
    }
}

function translateDiagnostic(d: Diagnostic, file: ts.SourceFile, start: number, length: number): ts.Diagnostic {
    const code = typeof d.code === 'number' ? d.code : 9999;
    const messageText = d.message.split('\n')[0];
    return {
        code,
        messageText,
        category: d.severity as ts.DiagnosticCategory,
        file,
        start,
        length,
        source: 'ts-css',
    };
}

function translateHover(
    hover: Hover,
    position: ts.LineAndCharacter,
    context: TemplateContext,
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
    const start = context.toOffset(hover.range ?  hover.range.start : position);
    return {
        kind: ts.ScriptElementKind.unknown,
        kindModifiers: '',
        textSpan: {
            start,
            length: hover.range ? context.toOffset(hover.range.end) - start : 1,
        },
        displayParts: [],
        documentation: contents,
        tags: [],
    };
}