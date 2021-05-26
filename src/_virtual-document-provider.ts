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
    toVirtualDocOffset(offset: number, context: TemplateContext): number;
    fromVirtualDocOffset(offset: number, context: TemplateContext): number;
}

/**
 * Standard virtual document provider for styled content.
 *
 * Wraps content in a top level `:root { }` rule to make css language service happy
 * since styled allows properties to be top level elements.
 */
export class StyledVirtualDocumentFactory implements VirtualDocumentProvider {
    private static readonly wrapperPreRoot = ':root{\n';
    private static readonly wrapperPreKeyframes = '@keyframes custom {\n';

    public createVirtualDocument(
        context: TemplateContext
    ): vscode.TextDocument {
        const contents = `${this.getVirtualDocumentRoot(context)}${context.text}}`;
        return {
            uri: 'untitled://embedded.scss',
            languageId: 'scss',
            version: 1,
            getText: () => contents,
            positionAt: (offset: number) => {
                const pos = context.toPosition(this.fromVirtualDocOffset(offset, context));
                return this.toVirtualDocPosition(pos);
            },
            offsetAt: (p: vscode.Position) => {
                const offset = context.toOffset(this.fromVirtualDocPosition(p));
                return this.toVirtualDocOffset(offset, context);
            },
            lineCount: contents.split(/\n/g).length + 1,
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

    public toVirtualDocOffset(offset: number, context: TemplateContext): number {
        return offset + this.getVirtualDocumentRoot(context).length;
    }

    public fromVirtualDocOffset(offset: number, context: TemplateContext): number {
        return offset - this.getVirtualDocumentRoot(context).length;
    }

    private getVirtualDocumentRoot(context: TemplateContext): string {
        const tag = (context.node.parent as ts.Node & { tag: any })?.tag?.escapedText;
        return tag === 'keyframes' ? StyledVirtualDocumentFactory.wrapperPreKeyframes : StyledVirtualDocumentFactory.wrapperPreRoot;
    }
}
