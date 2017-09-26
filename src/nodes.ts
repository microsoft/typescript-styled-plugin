// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';

export function findNode(
    sourceFile: ts.SourceFile,
    position: number
): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node;
        }
    }
    return find(sourceFile);
}

export function findAllNodes(
    sourceFile: ts.SourceFile,
    cond: (n: ts.Node) => boolean
): ts.Node[] {
    const result: ts.Node[] = [];
    function find(node: ts.Node) {
        if (cond(node)) {
            result.push(node);
            return;
        } else {
            ts.forEachChild(node, find);
        }
    }
    find(sourceFile);
    return result;
}

export function isTagged(node: ts.Node, tags: string[]): boolean {
    if (!node || !node.parent) {
        return false;
    }
    if (node.parent.kind !== ts.SyntaxKind.TaggedTemplateExpression) {
        return false;
    }
    const tagNode = node.parent as ts.TaggedTemplateExpression;
    const text = tagNode.tag.getText();
    return tags.some(tag =>
        text === tag
        || text.startsWith(tag + '.')
        || text.startsWith(tag + '('));
}
