"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SchemaManager = (function () {
    function SchemaManager(_info) {
        this._info = _info;
        this._onChanges = [];
    }
    SchemaManager.prototype.registerOnChange = function (cb) {
        var _this = this;
        this._onChanges.push(cb);
        return function () {
            _this._onChanges = _this._onChanges.filter(function (x) { return x !== cb; });
        };
    };
    SchemaManager.prototype.emitChange = function () {
        var data = this.getSchema();
        if (!data)
            return;
        this._onChanges.forEach(function (cb) { return cb(data); });
    };
    SchemaManager.prototype.log = function (msg) {
        this._info.project.projectService.logger.info("[ts-graphql-plugin] " + msg);
    };
    return SchemaManager;
}());
exports.SchemaManager = SchemaManager;
//# sourceMappingURL=schema-manager.js.map