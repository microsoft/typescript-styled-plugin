"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var file_schema_manager_1 = require("./file-schema-manager");
var http_schema_manager_1 = require("./http-schema-manager");
function isFileType(conf) {
    return !!conf.file;
}
exports.isFileType = isFileType;
function isHttpType(conf) {
    return !!conf.http;
}
exports.isHttpType = isHttpType;
var SchemaManagerFactory = (function () {
    function SchemaManagerFactory(_info) {
        this._info = _info;
    }
    SchemaManagerFactory.prototype.create = function () {
        var schemaConfig = this._info.config.schema;
        var options;
        if (typeof schemaConfig === 'string') {
            options = this._convertOptionsFromString(schemaConfig);
        }
        else {
            options = schemaConfig;
        }
        if (isFileType(options)) {
            return new file_schema_manager_1.FileSchemaManager(this._info, options.file);
        }
        else if (isHttpType(options)) {
            return new http_schema_manager_1.HttpSchemaManager(this._info, options.http);
        }
        return null;
    };
    SchemaManagerFactory.prototype._convertOptionsFromString = function (path) {
        if (/https?/.test(path)) {
            return {
                http: {
                    url: path,
                },
            };
        }
        else {
            return {
                file: {
                    path: path,
                },
            };
        }
    };
    return SchemaManagerFactory;
}());
exports.SchemaManagerFactory = SchemaManagerFactory;
//# sourceMappingURL=schema-manager-factory.js.map