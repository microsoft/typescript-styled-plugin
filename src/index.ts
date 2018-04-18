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
                    const post = templateString.slice(end);
                    const replacementChar = pre.match(/(^|\n)\s*$/g) && !post.match(/^\s*\{/) /* ${'button'} */ ? ' ' : 'x';

                    const result = placeholder.replace(/./gm, c => c === '\n' ? '\n' : replacementChar);

                    // If followed by a semicolon, we may have to eat the semi colon using a false property
                    if (replacementChar === ' ' && post.match(/^\s*;/)) {
                        // Handle case where we need to eat the semi colon:
                        //
                        // styled.x`
                        //     ${'color: red'};
                        // `
                        //
                        // vs. the other case where we do not:
                        //
                        // styled.x`
                        //     color: ${'red'};
                        // `
                        if (pre.match(/(;|^|\})[\s|\n]*$$/)) {
                            // Mixin, replace with a dummy variable declaration, so scss server doesn't complain about rogue semicolon
                            return '$a:0' + result.slice(4); // replace(/./gm, c => c === '\n' ? '\n' : ' ');
                        }
                        return placeholder.replace(/./gm, c => c === '\n' ? '\n' : 'x');
                    }

                    return result;
                },
            }, { logger });
        },
    };
};
