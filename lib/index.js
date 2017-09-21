"use strict";
const ts = require("typescript/lib/tsserverlibrary");
const styled_string_language_service_1 = require("./styled-string-language-service");
const template_string_language_service_proxy_1 = require("./template-string-language-service-proxy");
const nodes_1 = require("./nodes");
const config_1 = require("./config");
const configuration_1 = require("./configuration");
class LanguageServiceScriptSourceHelper {
    constructor(languageService) {
        this.languageService = languageService;
    }
    getNode(fileName, position) {
        return nodes_1.findNode(this.languageService.getProgram().getSourceFile(fileName), position);
    }
    getAllNodes(fileName, cond) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return nodes_1.findAllNodes(s, cond);
    }
    getLineAndChar(fileName, position) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getLineAndCharacterOfPosition(s, position);
    }
    getOffset(fileName, line, character) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getPositionOfLineAndCharacter(s, line, character);
    }
}
class LanguageServiceLogger {
    constructor(info) {
        this.info = info;
    }
    log(msg) {
        this.info.project.projectService.logger.info(`[${config_1.pluginName}] ${msg}`);
    }
}
function create(info) {
    const logger = new LanguageServiceLogger(info);
    const config = configuration_1.loadConfiguration(info.config);
    logger.log('config: ' + JSON.stringify(config));
    const helper = new LanguageServiceScriptSourceHelper(info.languageService);
    const adapter = new styled_string_language_service_1.default();
    return template_string_language_service_proxy_1.createTemplateStringLanguageServiceProxy(info.languageService, helper, adapter, logger, config.tags);
}
module.exports = (mod) => {
    return { create };
};
//# sourceMappingURL=index.js.map