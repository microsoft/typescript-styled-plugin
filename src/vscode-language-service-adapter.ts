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

export interface LanguageServiceAdapterCreateOptions {
    logger?: (msg: string) => void;
    tag?: string;
}

export type GetCompletionAtPosition = ts.LanguageService['getCompletionsAtPosition'];
export type GetSemanticDiagnostics = ts.LanguageService['getSemanticDiagnostics'];
export type GetQuickInfoAtPosition = ts.LanguageService['getQuickInfoAtPosition'];

export interface ScriptSourceHelper {
    getAllNodes: (fileName: string, condition: (n: ts.Node) => boolean) => ts.Node[];
    getNode: (fileName: string, position: number) => ts.Node | undefined;
    getLineAndChar: (fileName: string, position: number) => ts.LineAndCharacter;
    getOffset(fileName: string, line: number, character: number): number;
}

export class VscodeLanguageServiceAdapter {

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

    getCompletionAtPosition(delegate: GetCompletionAtPosition, fileName: string, position: number) {
        const node = this._helper.getNode(fileName, position);
        if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return delegate(fileName, position);
        }
        const baseLC = this._helper.getLineAndChar(fileName, node.getStart());
        const cursorLC = this._helper.getLineAndChar(fileName, position);
        const relativeLC = relative(baseLC, cursorLC);

        const cssLanguageService = this.languageService;
        const doc = this.createTextDocumentForTemplateString(fileName, node);
        const stylesheet = cssLanguageService.parseStylesheet(doc);
        const items = cssLanguageService.doComplete(doc, relativeLC, stylesheet);
        return translateCompletionItems(items);
    }

    getQuickInfoAtPosition(delegate: GetQuickInfoAtPosition, fileName: string, position: number): ts.QuickInfo {
        const node = this._helper.getNode(fileName, position);
        if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return delegate(fileName, position);
        }

        const baseLC = this._helper.getLineAndChar(fileName, node.getStart());
        const cursorLC = this._helper.getLineAndChar(fileName, position);
        const relativeLC = relative(baseLC, cursorLC);

        const cssLanguageService = this.languageService;
        const doc = this.createTextDocumentForTemplateString(fileName, node);
        const stylesheet = cssLanguageService.parseStylesheet(doc);
        const hover = cssLanguageService.doHover(doc, relativeLC, stylesheet);
        return translateHover(hover, position, 1);
    }

    getSemanticDiagnostics(delegate: GetSemanticDiagnostics, fileName: string) {
        const errors = delegate(fileName) || [];
        const allTemplateStringNodes = this._helper.getAllNodes(
            fileName,
            (n: ts.Node) => n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral,
        );
        const nodes = allTemplateStringNodes.filter(n => {
            if (!this._tagCondition) return true;
            return isTagged(n, this._tagCondition);
        });

        const cssLanguageService = this.languageService;
        const diagonosticsList = nodes.map(node => {
            const doc = this.createTextDocumentForTemplateString(fileName, node);
            const stylesheet = cssLanguageService.parseStylesheet(doc);
            return cssLanguageService.doValidation(doc, stylesheet);
        });
        const result = [...errors];
        diagonosticsList.forEach((diagnostics, i) => {
            const node = nodes[i];
            const nodeLC = this._helper.getLineAndChar(fileName, node.getStart());
            const sourceFile = node.getSourceFile();
            for (const d of diagnostics) {
                const sl = nodeLC.line + d.range.start.line;
                const sc = d.range.start.line ?
                    d.range.start.character
                    : nodeLC.character + d.range.start.character;
                const el = nodeLC.line + d.range.end.line;
                const ec = d.range.end.line ? d.range.end.character : nodeLC.character + d.range.end.character;
                const start = ts.getPositionOfLineAndCharacter(sourceFile, sl, sc);
                const end = ts.getPositionOfLineAndCharacter(sourceFile, el, ec);
                result.push(translateDiagnostic(d, sourceFile, start, end - start));
            }
        });
        return result;
    }

    private get languageService(): LanguageService {
        if (!this._languageService) {
            this._languageService = getCSSLanguageService();
        }
        return this._languageService;
    }

    private createTextDocumentForTemplateString(
        fileName: string,
        node: ts.Node,
    ): TextDocument {
        const text = node.getText().slice(1, -1);
        const startOffset = node.getStart() + 1;
        const startPosition = this._helper.getLineAndChar(fileName, node.getStart());
        return {
            uri: 'untitled://embedded.css',
            languageId: 'css',
            version: 1,
            getText: () => text,
            positionAt: (offset: number) => {
                const docPosition = this._helper.getLineAndChar(fileName, startOffset + offset);
                return relative(startPosition, docPosition);
            },
            offsetAt: (p: Position) => {
                const line = startPosition.line + p.line;
                const character = p.line === 0 ? startPosition.character + p.character : p.character;
                return this._helper.getOffset(fileName, line, character) - startOffset;
            },
            lineCount: text.split(/n/g).length + 1,
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