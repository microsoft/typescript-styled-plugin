// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import StyledTemplateLanguageService from './styled-template-language-service';
import { decorateWithTemplateLanguageService, Logger } from 'typescript-template-language-service-decorator';
import { loadConfiguration } from './configuration';
import { LanguageServiceLogger } from './logger';

export = (mod: { typescript: typeof ts }) => {
    return {
        create(info: ts.server.PluginCreateInfo): ts.LanguageService {
            const logger = new LanguageServiceLogger(info);
            const config = loadConfiguration(info.config);

            logger.log('config: ' + JSON.stringify(config));

            return decorateWithTemplateLanguageService(mod.typescript, info.languageService, new StyledTemplateLanguageService(mod.typescript, config, logger), {
                tags: config.tags,
                enableForStringWithSubstitutions: true,
                getSubstitution(
                    templateString: string,
                    start: number,
                    end: number
                ): string {
                    const placeholder = templateString.slice(start, end);

                    // check to see if it's an in-property interplation, or a mixin,
                    // and determine which character to use in either case
                    // if in-property, replace with "xxxxxx"
                    // if a mixin, replace with "      "
                    const pre = templateString.slice(0, start);
                    const replacementChar = pre.match(/(^|\n)\s*$/g) ? ' ' : 'x';

                    let result = placeholder.replace(/./gm, c => c === '\n' ? '\n' : replacementChar);

                    // check if it's a mixin and if followed by a semicolon
                    // if so, replace with a dummy variable declaration, so scss server doesn't complain about rogue semicolon
                    if (replacementChar === ' ' && templateString.slice(end).match(/^\s*;/)) {
                        result = '$a:0' + result.slice(4);
                    }
                    return result;
                },
            }, { logger });
        },
    };
};
