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
    ): ts.CompletionInfo  {
        const cssLanguageService = this.languageService;
        const doc = this.createTextDocumentForTemplateString(contents, context);
        const stylesheet = cssLanguageService.parseStylesheet(doc);
        const items = cssLanguageService.doComplete(doc, position, stylesheet);
        return translateCompletionItems(items);
    }

    getQuickInfoAtPosition(
        contents: string,
        position: ts.LineAndCharacter,
        context: TemplateContext,
    ): ts.QuickInfo | undefined {
        const cssLanguageService = this.languageService;
        const doc = this.createTextDocumentForTemplateString(contents, context);
        const stylesheet = cssLanguageService.parseStylesheet(doc);
        const hover = cssLanguageService.doHover(doc, position, stylesheet);
        if (hover) {
            return translateHover(hover, context.position, 1);
        }
        return undefined;
    }

    getSemanticDiagnostics?(
        contents: string,
        context: TemplateContext,
    ): ts.Diagnostic[] {
        const cssLanguageService = this.languageService;
        const doc = this.createTextDocumentForTemplateString(contents, context);
        const stylesheet = cssLanguageService.parseStylesheet(doc);
        const diag = cssLanguageService.doValidation(doc, stylesheet);
        return diag.map(x => {
            return translateDiagnostic(x, context.node.getSourceFile(),
                doc.offsetAt(x.range.start),
                doc.offsetAt(x.range.end) - doc.offsetAt(x.range.start));
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
        kind: item.kind ? translateionCompletionItemKind(item.kind) : 'unknown',
        sortText: '0',
    };
}

function translateionCompletionItemKind(kind: CompletionItemKind): string {
    switch (kind) {
        case CompletionItemKind.Method:
            return 'method';
        case CompletionItemKind.Function:
            return 'function';
        case CompletionItemKind.Constructor:
            return 'constructor';
        case CompletionItemKind.Field:
        case CompletionItemKind.Variable:
            return 'variable';
        case CompletionItemKind.Class:
            return 'class';
        case CompletionItemKind.Interface:
            return 'interface';
        case CompletionItemKind.Module:
            return 'module';
        case CompletionItemKind.Property:
            return 'property';
        case CompletionItemKind.Unit:
        case CompletionItemKind.Value:
            return 'const';
        case CompletionItemKind.Enum:
            return 'enum';
        case CompletionItemKind.Keyword:
            return 'keyword';
        case CompletionItemKind.Color:
            return 'const';
        case CompletionItemKind.Reference:
            return 'alias';
        case CompletionItemKind.File:
            return 'file';
        case CompletionItemKind.Snippet:
        case CompletionItemKind.Text:
        default:
            return 'unknown';
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

function translateHover(hover: Hover, start: number, length: number): ts.QuickInfo {
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
    return {
        kind: '',
        kindModifiers: '',
        textSpan: { start, length },
        displayParts: [],
        documentation: contents,
        tags: [],
    };
}