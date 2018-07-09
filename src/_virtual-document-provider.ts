// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { TemplateContext } from 'typescript-template-language-service-decorator';
import * as vscode from 'vscode-languageserver-types';

/**
 * Handles mapping between template contents to virtual documents.
 */
export interface VirtualDocumentProvider {
    createVirtualDocument(context: TemplateContext): vscode.TextDocument;
    toVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter;
    fromVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter;
    toVirtualDocOffset(offset: number): number;
    fromVirtualDocOffset(offset: number): number;
}

/**
 * Standard virtual document provider for styled content.
 *
 * Wraps content in a top level `:root { }` rule to make css language service happy
 * since styled allows properties to be top level elements.
 */
export class StyledVirtualDocumentFactory implements VirtualDocumentProvider {
    private static readonly wrapperPre = ':root{\n';

    public createVirtualDocument(
        context: TemplateContext
    ): vscode.TextDocument {
        const contents = `${StyledVirtualDocumentFactory.wrapperPre}${context.text}\n}`;
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

    public toVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter {
        return {
            line: position.line + 1,
            character: position.character,
        };
    }

    public fromVirtualDocPosition(position: ts.LineAndCharacter): ts.LineAndCharacter {
        return {
            line: position.line - 1,
            character: position.character,
        };
    }

    public toVirtualDocOffset(offset: number): number {
        return offset + StyledVirtualDocumentFactory.wrapperPre.length;
    }

    public fromVirtualDocOffset(offset: number): number {
        return offset - StyledVirtualDocumentFactory.wrapperPre.length;
    }
}