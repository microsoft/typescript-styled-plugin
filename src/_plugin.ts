// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { decorateWithTemplateLanguageService, TemplateSettings } from 'typescript-template-language-service-decorator';
import * as ts from 'typescript/lib/tsserverlibrary';
import { loadConfiguration, StyledPluginConfiguration } from './_configuration';
import { StyledTemplateLanguageService } from './_language-service';
import { LanguageServiceLogger } from './_logger';
import { getSubstitutions } from './_substituter';
import { StyledVirtualDocumentFactory } from './_virtual-document-provider';

export class StyledPlugin {
    public constructor(
        private readonly typescript: typeof ts
    ) { }

    public create(info: ts.server.PluginCreateInfo): ts.LanguageService {
        const logger = new LanguageServiceLogger(info);
        const config = loadConfiguration(info.config);

        logger.log('config: ' + JSON.stringify(config));

        return decorateWithTemplateLanguageService(
            this.typescript,
            info.languageService,
            new StyledTemplateLanguageService(this.typescript, config, new StyledVirtualDocumentFactory(), logger),
            getTemplateSettings(config),
            { logger });
    }
}

export function getTemplateSettings(config: StyledPluginConfiguration): TemplateSettings {
    return {
        tags: config.tags as string[],
        enableForStringWithSubstitutions: true,
        getSubstitutions(templateString, spans): string {
            return getSubstitutions(templateString, spans);
        },
    };
}
