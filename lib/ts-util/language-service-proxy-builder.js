"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LanguageServiceProxyBuilder = (function () {
    function LanguageServiceProxyBuilder(_info /*ts.server.PluginCreateInfo*/) {
        this._info = _info; /*ts.server.PluginCreateInfo*/
        this._wrappers = [];
    }
    LanguageServiceProxyBuilder.prototype.wrap = function (name, wrapper) {
        this._wrappers.push({ name: name, wrapper: wrapper });
        return this;
    };
    LanguageServiceProxyBuilder.prototype.build = function () {
        var _this = this;
        var ret = this._info.languageService;
        this._wrappers.forEach(function (_a) {
            var name = _a.name, wrapper = _a.wrapper;
            ret[name] = wrapper(_this._info.languageService[name], _this._info);
        });
        return ret;
    };
    return LanguageServiceProxyBuilder;
}());
exports.LanguageServiceProxyBuilder = LanguageServiceProxyBuilder;
//# sourceMappingURL=language-service-proxy-builder.js.map