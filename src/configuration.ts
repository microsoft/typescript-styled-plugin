export interface TsCssPluginConfiguration {
    tags: string[];
}

export const defaultConfiguration: TsCssPluginConfiguration = {
    tags: ['styled'],
};

export const loadConfiguration = (config: any): TsCssPluginConfiguration =>
    Object.assign({}, defaultConfiguration, config);