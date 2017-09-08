"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ava_1 = require("ava");
var schema_manager_factory_1 = require("./schema-manager-factory");
var http_schema_manager_1 = require("./http-schema-manager");
var file_schema_manager_1 = require("./file-schema-manager");
ava_1.default('should return HttpSchemaManager from http url string', function (t) {
    var facotry = new schema_manager_factory_1.SchemaManagerFactory({
        config: {
            schema: 'http://localhost',
        },
    });
    var actual = facotry.create();
    t.true(actual instanceof http_schema_manager_1.HttpSchemaManager);
});
ava_1.default('should return HttpSchemaManager from https url string', function (t) {
    var facotry = new schema_manager_factory_1.SchemaManagerFactory({
        config: {
            schema: 'https://localhost',
        },
    });
    var actual = facotry.create();
    t.true(actual instanceof http_schema_manager_1.HttpSchemaManager);
});
ava_1.default('should return FileSchemaManager from file schema string', function (t) {
    var facotry = new schema_manager_factory_1.SchemaManagerFactory({
        config: {
            schema: 'file:///tmp/s.json',
        },
    });
    var actual = facotry.create();
    t.true(actual instanceof file_schema_manager_1.FileSchemaManager);
});
ava_1.default('should return FileSchemaManager from no schema string', function (t) {
    var facotry = new schema_manager_factory_1.SchemaManagerFactory({
        config: {
            schema: '/tmp/s.json',
        },
    });
    var actual = facotry.create();
    t.true(actual instanceof file_schema_manager_1.FileSchemaManager);
});
ava_1.default('should return HttpSchemaManager from http object', function (t) {
    var facotry = new schema_manager_factory_1.SchemaManagerFactory({
        config: {
            schema: {
                http: {
                    url: 'http://localhost',
                },
            },
        },
    });
    var actual = facotry.create();
    t.true(actual instanceof http_schema_manager_1.HttpSchemaManager);
});
ava_1.default('should return FileSchemaManager from file object', function (t) {
    var facotry = new schema_manager_factory_1.SchemaManagerFactory({
        config: {
            schema: {
                file: {
                    path: 'http://localhost',
                },
            },
        },
    });
    var actual = facotry.create();
    t.true(actual instanceof file_schema_manager_1.FileSchemaManager);
});
//# sourceMappingURL=schema-manager-factory.test.js.map