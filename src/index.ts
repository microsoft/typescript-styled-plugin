import * as ts from 'typescript/lib/tsserverlibrary';
import { VscodeLanguageServiceAdapter, ScriptSourceHelper } from './vscode-language-service-adapter';
import { createTemplateStringLanguageServiceProxy } from './ts-util/language-service-proxy-builder';
import { findAllNodes, findNode } from './ts-util/nodes';
import { pluginName } from './config';
import { loadConfiguration } from './configuration';
import Logger from './logger';

class LanguageServiceScriptSourceHelper implements ScriptSourceHelper {
    constructor(
        private readonly languageService: ts.LanguageService,
    ) { }

    getNode(fileName: string, position: number) {
        return findNode(this.languageService.getProgram().getSourceFile(fileName), position);
    }
    getAllNodes(fileName: string, cond: (n: ts.Node) => boolean) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return findAllNodes(s, cond);
    }
    getLineAndChar(fileName: string, position: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getLineAndCharacterOfPosition(s, position);
    }

    getOffset(fileName: string, line: number, character: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getPositionOfLineAndCharacter(s, line, character);
    }
}

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const config = loadConfiguration(info.config);

    const standardLogger: Logger = {
        log(msg: string) {
            info.project.projectService.logger.info(`[${pluginName}] ${msg}`);
        },
    };

    standardLogger.log('config: ' + JSON.stringify(config));

    const helper = new LanguageServiceScriptSourceHelper(info.languageService);
    const adapter = new VscodeLanguageServiceAdapter(helper, standardLogger);
    return createTemplateStringLanguageServiceProxy(info.languageService, helper, adapter, standardLogger, config);
}

export = (mod: { typescript: typeof ts }) => {
    return { create };
};
