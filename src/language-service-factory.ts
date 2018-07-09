// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { decorateWithTemplateLanguageService } from 'typescript-template-language-service-decorator';
import { loadConfiguration } from './_configuration';
import { LanguageServiceLogger } from './_logger';
import StyledTemplateLanguageService from './language-service';
import { getSubstitutions } from './substituter';
import { VirtualDocumentFactory } from './virtual-document-factory';
import * as ts from 'typescript/lib/tsserverlibrary';

export class LanguageServiceFactory {
    public constructor(
        private readonly typescript: typeof ts,
        private readonly virtualDocumentFactory: VirtualDocumentFactory
    ) { }

    public create(info: ts.server.PluginCreateInfo): ts.LanguageService {
        const logger = new LanguageServiceLogger(info);
        const config = loadConfiguration(info.config);

        logger.log('config: ' + JSON.stringify(config));

        return decorateWithTemplateLanguageService(this.typescript, info.languageService, new StyledTemplateLanguageService(this.typescript, config, this.virtualDocumentFactory, logger), {
            tags: config.tags,
            enableForStringWithSubstitutions: true,
            getSubstitutions(templateString, spans): string {
                return getSubstitutions(templateString, spans);
            },
        }, { logger });
    }
}