import * as ts from 'typescript/lib/tsserverlibrary';

export type TagCondition = string;

export function findNode(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node;
        }
    }
    return find(sourceFile);
}

export function findAllNodes(sourceFile: ts.SourceFile, cond: (n: ts.Node) => boolean): ts.Node[] {
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

export function isTagged(node: ts.Node, condition: TagCondition) {
    if (!node || !node.parent) return false;
    if (node.parent.kind !== ts.SyntaxKind.TaggedTemplateExpression) return false;
    const tagNode = node.parent as ts.TaggedTemplateExpression;
    return tagNode.tag.getText() === condition;
}
