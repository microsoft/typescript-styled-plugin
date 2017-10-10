// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import StyledTemplateLanguageService from './styled-template-language-service';
import { decorateWithTemplateLanguageService, Logger } from 'typescript-template-language-service-decorator';
import { pluginName } from './config';
import { loadConfiguration } from './configuration';

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

    return decorateWithTemplateLanguageService(info.languageService, new StyledTemplateLanguageService(config), {
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
    }, { logger });
}

export = (mod: { typescript: typeof ts }) => {
    return { create };
};
