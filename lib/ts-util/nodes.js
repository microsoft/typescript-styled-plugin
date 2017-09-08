"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
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
    var result = [];
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
function isTagged(node, condition) {
    if (!node || !node.parent)
        return false;
    if (node.parent.kind !== ts.SyntaxKind.TaggedTemplateExpression)
        return false;
    var tagNode = node.parent;
    return tagNode.tag.getText() === condition;
}
exports.isTagged = isTagged;
//# sourceMappingURL=nodes.js.map