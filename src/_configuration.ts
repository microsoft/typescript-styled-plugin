// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface StyledPluginConfiguration {
    readonly tags: ReadonlyArray<string>;
    readonly validate: boolean;
    readonly lint: { [key: string]: any };
    readonly emmet: { [key: string]: any };
}

const defaultConfiguration: StyledPluginConfiguration = {
    tags: ['styled', 'css', 'extend'],
    validate: true,
    lint: {
        emptyRules: 'ignore',
    },
    emmet: {},
};

export const loadConfiguration = (config: any): StyledPluginConfiguration => {
    const lint = Object.assign({}, defaultConfiguration.lint, config.lint || {});
    return {
        tags: config.tags || defaultConfiguration.tags,
        validate: typeof config.validate !== 'undefined' ? config.validate : defaultConfiguration.validate,
        lint,
        emmet: config.emmet || defaultConfiguration.emmet,
    };
};