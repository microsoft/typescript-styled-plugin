export interface TsStyledPluginConfiguration {
    tags: string[];
    validate: boolean;
    lint: { [ key: string ]: any };
}

export const defaultConfiguration: TsStyledPluginConfiguration = {
    tags: ['styled'],
    validate: true,
    lint: { }
};

export const loadConfiguration = (config: any): TsStyledPluginConfiguration => {
    const lint = Object.assign({}, defaultConfiguration.lint, config.lint || {});
    return {
        tags: config.tags || defaultConfiguration.tags,
        validate: typeof config.validate !== 'undefined' ? config.validate : defaultConfiguration.validate,
        lint
    };
}