import * as ts from 'typescript';

export type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: any/*ts.server.PluginCreateInfo*/) => ts.LanguageService[K];

export class LanguageServiceProxyBuilder {

    private _wrappers: any[] = [];

    constructor(private _info: any /*ts.server.PluginCreateInfo*/) { }

    wrap<K extends keyof ts.LanguageService>(name: K, wrapper: LanguageServiceMethodWrapper<K>) {
        this._wrappers.push({ name, wrapper });
        return this;
    }

    build() {
        const ret: any = this._info.languageService;
        this._wrappers.forEach(({ name, wrapper }) => {
            ret[name] = wrapper((this._info.languageService as any)[name], this._info);
        });
        return ret;
    }
}
