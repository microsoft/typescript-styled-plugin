// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import StyledStringLanguageService from './styled-string-language-service';
import { createTemplateStringLanguageServiceProxy, ScriptSourceHelper } from './template-string-language-service-proxy';
import { findAllNodes, findNode } from './nodes';
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

class LanguageServiceLogger implements Logger {
    constructor(
        private readonly info: ts.server.PluginCreateInfo
    ) { }

    log(msg: string) {
        this.info.project.projectService.logger.info(`[${pluginName}] ${msg}`);
    }
}

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const logger = new LanguageServiceLogger(info);
    const config = loadConfiguration(info.config);

    logger.log('config: ' + JSON.stringify(config));

    const helper = new LanguageServiceScriptSourceHelper(info.languageService);
    const adapter = new StyledStringLanguageService(config);
    return createTemplateStringLanguageServiceProxy(info.languageService, helper, adapter, logger, config.tags);
}

export = (mod: { typescript: typeof ts }) => {
    return { create };
};
