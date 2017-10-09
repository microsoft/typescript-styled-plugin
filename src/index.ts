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
        private readonly languageService: ts.LanguageService
    ) { }

    public getNode(fileName: string, position: number) {
        return findNode(this.languageService.getProgram().getSourceFile(fileName), position);
    }
    public getAllNodes(fileName: string, cond: (n: ts.Node) => boolean) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return findAllNodes(s, cond);
    }
    public getLineAndChar(fileName: string, position: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getLineAndCharacterOfPosition(s, position);
    }

    public getOffset(fileName: string, line: number, character: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return ts.getPositionOfLineAndCharacter(s, line, character);
    }
}

class LanguageServiceLogger implements Logger {
    constructor(
        private readonly info: ts.server.PluginCreateInfo
    ) { }

    public log(msg: string) {
        this.info.project.projectService.logger.info(`[${pluginName}] ${msg}`);
    }
}

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const logger = new LanguageServiceLogger(info);
    const config = loadConfiguration(info.config);

    logger.log('config: ' + JSON.stringify(config));

    const helper = new LanguageServiceScriptSourceHelper(info.languageService);
    const adapter = new StyledStringLanguageService(config);
    return createTemplateStringLanguageServiceProxy(info.languageService, helper, adapter, logger, {
        tags: config.tags,
        enableForStringWithSubstitutions: true,
        getSubstitution(
            templateString: string,
            start: number,
            end: number
        ): string {
            const placeholder = templateString.slice(start, end);
            const pre = templateString.slice(0, start);
            const replacementChar = pre.match(/(^|\n)\s*$/g) ? ' ' : 'x';
            return placeholder.replace(/./gm, c => c === '\n' ? '\n' : replacementChar);
        },
    });
}

export = (mod: { typescript: typeof ts }) => {
    return { create };
};
