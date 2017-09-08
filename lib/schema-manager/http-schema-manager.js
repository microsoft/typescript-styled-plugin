"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var buffer_1 = require("buffer");
var url_1 = require("url");
var Http = require("http");
var Https = require("https");
var utilities_1 = require("graphql/utilities");
var schema_manager_1 = require("./schema-manager");
var INTROSPECTION_QUERY_BODY = JSON.stringify({
    query: utilities_1.introspectionQuery,
});
var INTROSPECTION_QUERY_LENGTH = buffer_1.Buffer.byteLength(INTROSPECTION_QUERY_BODY);
var HttpSchemaManager = (function (_super) {
    __extends(HttpSchemaManager, _super);
    function HttpSchemaManager(_info, _options) {
        var _this = _super.call(this, _info) || this;
        _this._options = _options;
        _this._schema = null;
        return _this;
    }
    HttpSchemaManager.request = function (options) {
        var headers = __assign({ 'Content-Type': 'application/json', 'Content-Length': INTROSPECTION_QUERY_LENGTH, 'User-Agent': 'ts-graphql-plugin' }, options.headers);
        return new Promise(function (resolve, reject) {
            var uri = url_1.parse(options.url);
            var body = '';
            var r = uri.protocol === 'https:' ? Https.request : Http.request;
            var req = r({
                hostname: uri.hostname,
                protocol: uri.protocol,
                path: uri.path,
                port: Number.parseInt(uri.port),
                headers: headers,
                method: options.method,
            }, function (res) {
                res.on('data', function (chunk) { return body += chunk; });
                res.on('end', function () {
                    if (res.statusCode < 200 || res.statusCode > 300) {
                        reject({
                            statusCode: res.statusCode,
                            body: body,
                        });
                    }
                    else {
                        var data = void 0;
                        try {
                            data = JSON.parse(body);
                            resolve(data);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                });
            });
            req.on('error', function (reason) {
                reject(reason);
            });
            req.write(INTROSPECTION_QUERY_BODY);
            req.end();
        });
    };
    HttpSchemaManager.prototype.getSchema = function () {
        return this._schema;
    };
    HttpSchemaManager.prototype.startWatch = function (interval) {
        var _this = this;
        if (interval === void 0) { interval = 1000; }
        var request = function (backoff) {
            if (backoff === void 0) { backoff = interval; }
            HttpSchemaManager.request(_this._options).then(function (data) {
                _this.log("Fetch schema data from " + _this._options.url + ".");
                if (_this._shouldUpdate(data)) {
                    _this._schema = data;
                    _this.log("Updated with: " + JSON.stringify(data));
                    _this.emitChange();
                }
                setTimeout(request, interval);
            }).catch(function (reason) {
                _this.log("Fail to fetch schema data from " + _this._options.url + " via:");
                _this.log("" + JSON.stringify(reason, null, 2));
                setTimeout(request, backoff * 2.0);
            });
        };
        request();
    };
    HttpSchemaManager.prototype._shouldUpdate = function (newSchama) {
        if (!this._schema) {
            if (newSchama)
                return true;
            return false;
        }
        if (!newSchama)
            return false;
        return JSON.stringify(this._schema) !== JSON.stringify(newSchama);
    };
    return HttpSchemaManager;
}(schema_manager_1.SchemaManager));
exports.HttpSchemaManager = HttpSchemaManager;
//# sourceMappingURL=http-schema-manager.js.map