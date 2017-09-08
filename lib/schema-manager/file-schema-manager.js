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
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var schema_manager_1 = require("./schema-manager");
var FileSchemaManager = (function (_super) {
    __extends(FileSchemaManager, _super);
    function FileSchemaManager(_info, options) {
        var _this = _super.call(this, _info) || this;
        _this._schemaPath = options.path;
        return _this;
    }
    FileSchemaManager.prototype.getSchema = function () {
        if (!this._schemaPath || typeof this._schemaPath !== 'string')
            return;
        try {
            var resolvedSchmaPath = this.getAbsoluteSchemaPath(this._info.project.getProjectRootPath(), this._schemaPath);
            this.log('Read schema from ' + resolvedSchmaPath);
            var isExists = this._info.languageServiceHost.fileExists(resolvedSchmaPath);
            if (!isExists)
                return;
            return JSON.parse(this._info.languageServiceHost.readFile(resolvedSchmaPath, 'utf-8'));
        }
        catch (e) {
            this._log('Fail to read schema file...');
            this._log(e.message);
            return;
        }
    };
    FileSchemaManager.prototype.getAbsoluteSchemaPath = function (projectRootPath, schemaPath) {
        if (path.isAbsolute(schemaPath))
            return schemaPath;
        return path.resolve(projectRootPath, schemaPath);
    };
    FileSchemaManager.prototype.startWatch = function (interval) {
        var _this = this;
        if (interval === void 0) { interval = 100; }
        try {
            var resolvedSchmaPath = this.getAbsoluteSchemaPath(this._info.project.getProjectRootPath(), this._schemaPath);
            this._watcher = this._info.serverHost.watchFile(resolvedSchmaPath, function () {
                _this._log('Change schema file.');
                _this.emitChange();
            }, interval);
        }
        catch (e) {
            this._log('Fail to read schema file...');
            this._log(e.message);
            return;
        }
    };
    FileSchemaManager.prototype.closeWatch = function () {
        if (this._watcher)
            this._watcher.close();
    };
    FileSchemaManager.prototype._log = function (msg) {
        this._info.project.projectService.logger.info("[ts-graphql-plugin] " + msg);
    };
    return FileSchemaManager;
}(schema_manager_1.SchemaManager));
exports.FileSchemaManager = FileSchemaManager;
//# sourceMappingURL=file-schema-manager.js.map