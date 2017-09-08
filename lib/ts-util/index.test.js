"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ava_1 = require("ava");
var ts = require("typescript/lib/tsserverlibrary");
var _1 = require("./");
ava_1.default('isTagged should return true when the tag condition is matched', function (t) {
    var text = 'function myTag(...args: any[]) { return "" }' + '\n'
        + 'const x = myTag`query { }`';
    var s = ts.createSourceFile('input.ts', text, 2 /* ES2015 */, true);
    var node = _1.findNode(s, text.length - 3);
    t.truthy(_1.isTagged(node, 'myTag'));
});
ava_1.default('isTagged should return true when the tag condition is not matched', function (t) {
    var text = 'function myTag(...args: any[]) { return "" }' + '\n'
        + 'const x = myTag`query { }`';
    var s = ts.createSourceFile('input.ts', text, 2 /* ES2015 */, true);
    var node = _1.findNode(s, text.length - 3);
    t.falsy(_1.isTagged(node, 'MyTag'));
});
ava_1.default('findAllNodes should return nodes which match given condition', function (t) {
    var text = 'const a = `AAA`;' + '\n'
        + 'const b = `BBB`;';
    var s = ts.createSourceFile('input.ts', text, 2 /* ES2015 */, true);
    var actual = _1.findAllNodes(s, function (node) { return node.kind === 13 /* NoSubstitutionTemplateLiteral */; });
    t.is(actual.length, 2);
    t.deepEqual(actual.map(function (n) { return n.getText(); }), ['`AAA`', '`BBB`']);
});
//# sourceMappingURL=index.test.js.map