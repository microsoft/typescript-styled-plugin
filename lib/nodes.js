"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript/lib/tsserverlibrary");
function findNode(sourceFile, position) {
    function find(node) {
        if (position >= node.getStart() && position < node.getEnd()) {
            return ts.forEachChild(node, find) || node;
        }
    }
    return find(sourceFile);
}
exports.findNode = findNode;
function findAllNodes(sourceFile, cond) {
    const result = [];
    function find(node) {
        if (cond(node)) {
            result.push(node);
            return;
        }
        else {
            ts.forEachChild(node, find);
        }
    }
    find(sourceFile);
    return result;
}
exports.findAllNodes = findAllNodes;
function isTagged(node, tags) {
    if (!node || !node.parent) {
        return false;
    }
    if (node.parent.kind !== ts.SyntaxKind.TaggedTemplateExpression) {
        return false;
    }
    const tagNode = node.parent;
    const text = tagNode.tag.getText();
    return tags.some(tag => text === tag
        || text.startsWith(tag + '.')
        || text.startsWith(tag + '('));
}
exports.isTagged = isTagged;
//# sourceMappingURL=nodes.js.map