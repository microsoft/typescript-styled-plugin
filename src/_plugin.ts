// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { decorateWithTemplateLanguageService, TemplateSettings } from 'typescript-template-language-service-decorator';
import * as ts from 'typescript/lib/tsserverlibrary';
import { ConfigurationManager } from './_configuration';
import { StyledTemplateLanguageService } from './_language-service';
import { LanguageServiceLogger } from './_logger';
import { getSubstitutions } from './_substituter';
import { StyledVirtualDocumentFactory } from './_virtual-document-provider';

export class StyledPlugin {

    private _logger?: LanguageServiceLogger;
    private readonly _configManager = new ConfigurationManager();

    public constructor(
        private readonly typescript: typeof ts
    ) { }

    public create(info: ts.server.PluginCreateInfo): ts.LanguageService {
        this._logger = new LanguageServiceLogger(info);
        this._configManager.updateFromPluginConfig(info.config);

        this._logger.log('config: ' + JSON.stringify(this._configManager.config));

        if (!isValidTypeScriptVersion(this.typescript)) {
            this._logger.log('Invalid typescript version detected. TypeScript 3.x required.');
            return info.languageService;
        }

        return decorateWithTemplateLanguageService(
            this.typescript,
            info.languageService,
            info.project,
            new StyledTemplateLanguageService(this.typescript, this._configManager, new StyledVirtualDocumentFactory(), this._logger),
            getTemplateSettings(this._configManager),
            { logger: this._logger });
    }

    public onConfigurationChanged(config: any) {
        if (this._logger) {
            this._logger.log('onConfigurationChanged');
        }
        this._configManager.updateFromPluginConfig(config);
    }
}

export function getTemplateSettings(configManager: ConfigurationManager): TemplateSettings {
    return {
        get tags() { return configManager.config.tags; },
        enableForStringWithSubstitutions: true,
        getSubstitutions(templateString, spans): string {
            return getSubstitutions(templateString, spans);
        },
    };
}

function isValidTypeScriptVersion(typescript: typeof ts): boolean {
    const [major] = typescript.version.split('.');
    return +major >= 3;
}
