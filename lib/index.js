"use strict";
var ts = require("typescript/lib/tsserverlibrary");
var vscode_language_service_adapter_1 = require("./vscode-language-service-adapter");
var language_service_proxy_builder_1 = require("./ts-util/language-service-proxy-builder");
var nodes_1 = require("./ts-util/nodes");
var config_1 = require("./config");
var configuration_1 = require("./configuration");
var LanguageServiceScriptSourceHelper = /** @class */ (function () {
    function LanguageServiceScriptSourceHelper(languageService) {
        this.languageService = languageService;
    }
    LanguageServiceScriptSourceHelper.prototype.getNode = function (fileName, position) {
        return nodes_1.findNode(this.languageService.getProgram().getSourceFile(fileName), position);
    };
    LanguageServiceScriptSourceHelper.prototype.getAllNodes = function (fileName, cond) {
        var s = this.languageService.getProgram().getSourceFile(fileName);
        return nodes_1.findAllNodes(s, cond);
    };
    LanguageServiceScriptSourceHelper.prototype.getLineAndChar = function (fileName, position) {
        var s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getLineAndCharacterOfPosition(s, position);
    };
    LanguageServiceScriptSourceHelper.prototype.getOffset = function (fileName, line, character) {
        var s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getPositionOfLineAndCharacter(s, line, character);
    };
    return LanguageServiceScriptSourceHelper;
}());
function create(info) {
    var config = configuration_1.loadConfiguration(info.config);
    var standardLogger = {
        log: function (msg) {
            info.project.projectService.logger.info("[" + config_1.pluginName + "] " + msg);
        },
    };
    standardLogger.log('config: ' + JSON.stringify(config));
    var helper = new LanguageServiceScriptSourceHelper(info.languageService);
    var adapter = new vscode_language_service_adapter_1.VscodeLanguageServiceAdapter(helper, standardLogger);
    return language_service_proxy_builder_1.createTemplateStringLanguageServiceProxy(info.languageService, helper, adapter, standardLogger, config);
}
module.exports = function (mod) {
    return { create: create };
};
//# sourceMappingURL=index.js.map