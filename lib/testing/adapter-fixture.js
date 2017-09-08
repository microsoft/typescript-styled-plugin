"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript/lib/tsserverlibrary");
var ts_util_1 = require("../ts-util");
var graphql_language_service_adapter_1 = require("../graphql-language-service-adapter");
var AdapterFixture = (function () {
    function AdapterFixture(scriptFileName, schemaJson) {
        var _this = this;
        this._source = ts.createSourceFile(scriptFileName, '', 2 /* ES2015 */, true, 3 /* TS */);
        var getNode = function (fileName, position) { return ts_util_1.findNode(_this._source, position); };
        var getAllNodes = function (findNode, cond) {
            return ts_util_1.findAllNodes(_this._source, cond);
        };
        var getLineAndChar = function (fileName, position) {
            return ts.getLineAndCharacterOfPosition(_this._source, position);
        };
        var helper = {
            getNode: getNode,
            getAllNodes: getAllNodes,
            getLineAndChar: getLineAndChar,
        };
        this.adapter = new graphql_language_service_adapter_1.GraphQLLanguageServiceAdapter(helper, {
            schema: schemaJson,
        });
    }
    Object.defineProperty(AdapterFixture.prototype, "source", {
        get: function () {
            return this._source && this._source.getText();
        },
        set: function (newText) {
            var range = {
                span: {
                    start: 0,
                    length: this._source.getText().length,
                },
                newLength: newText.length,
            };
            this._source = this._source.update(newText, range);
        },
        enumerable: true,
        configurable: true
    });
    return AdapterFixture;
}());
exports.AdapterFixture = AdapterFixture;
//# sourceMappingURL=adapter-fixture.js.map