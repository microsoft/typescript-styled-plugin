// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface StyledPluginConfiguration {
    readonly tags: ReadonlyArray<string>;
    readonly validate: boolean;
    readonly lint: { [key: string]: any };
    readonly emmet: { [key: string]: any };
}

export class ConfigurationManager {

    private static readonly defaultConfiguration: StyledPluginConfiguration = {
        tags: ['styled', 'css', 'extend', 'injectGlobal', 'createGlobalStyle', 'keyframes'],
        validate: true,
        lint: {
            emptyRules: 'ignore',
        },
        emmet: {},
    };

    private readonly _configUpdatedListeners = new Set<() => void>();

    public get config(): StyledPluginConfiguration { return this._configuration; }
    private _configuration: StyledPluginConfiguration = ConfigurationManager.defaultConfiguration;

    public updateFromPluginConfig(config: StyledPluginConfiguration) {
        const lint = Object.assign({}, ConfigurationManager.defaultConfiguration.lint, config.lint || {});

        this._configuration = {
            tags: config.tags || ConfigurationManager.defaultConfiguration.tags,
            validate: typeof config.validate !== 'undefined' ? config.validate : ConfigurationManager.defaultConfiguration.validate,
            lint,
            emmet: config.emmet || ConfigurationManager.defaultConfiguration.emmet,
        };

        for (const listener of this._configUpdatedListeners) {
            listener();
        }
    }

    public onUpdatedConfig(listener: () => void) {
        this._configUpdatedListeners.add(listener);
    }
}