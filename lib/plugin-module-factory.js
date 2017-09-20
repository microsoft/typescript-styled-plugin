"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript/lib/tsserverlibrary");
var vscode_language_service_adapter_1 = require("./vscode-language-service-adapter");
var language_service_proxy_builder_1 = require("./ts-util/language-service-proxy-builder");
var nodes_1 = require("./ts-util/nodes");
function create(info) {
    var logger = function (msg) { return info.project.projectService.logger.info("[ts-css-plugin] " + msg); };
    logger('config: ' + JSON.stringify(info.config));
    var getNode = function (fileName, position) {
        return nodes_1.findNode(info.languageService.getProgram().getSourceFile(fileName), position);
    };
    var getAllNodes = function (fileName, cond) {
        var s = info.languageService.getProgram().getSourceFile(fileName);
        return nodes_1.findAllNodes(s, cond);
    };
    var getLineAndChar = function (fileName, position) {
        var s = info.languageService.getProgram().getSourceFile(fileName);
        return ts.getLineAndCharacterOfPosition(s, position);
    };
    var getOffset = function (fileName, line, character) {
        var s = info.languageService.getProgram().getSourceFile(fileName);
        return ts.getPositionOfLineAndCharacter(s, line, character);
    };
    var helper = {
        getNode: getNode,
        getAllNodes: getAllNodes,
        getLineAndChar: getLineAndChar,
        getOffset: getOffset,
    };
    var tag = info.config.tag;
    var adapter = new vscode_language_service_adapter_1.VscodeLanguageServiceAdapter(helper, { logger: logger });
    return language_service_proxy_builder_1.createTemplateStringLanguageServiceProxy(info.languageService, helper, adapter, tag);
}
var moduleFactory /*:ts.server.PluginModuleFactory*/ = function (mod) {
    return { create: create };
};
exports.default = moduleFactory;
//# sourceMappingURL=plugin-module-factory.js.map