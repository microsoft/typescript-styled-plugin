"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfiguration = {
    tags: ['styled'],
    validate: true,
    lint: {}
};
exports.loadConfiguration = (config) => {
    const lint = Object.assign({}, exports.defaultConfiguration.lint, config.lint || {});
    return {
        tags: config.tags || exports.defaultConfiguration.tags,
        validate: typeof config.validate !== 'undefined' ? config.validate : exports.defaultConfiguration.validate,
        lint
    };
};
//# sourceMappingURL=configuration.js.map