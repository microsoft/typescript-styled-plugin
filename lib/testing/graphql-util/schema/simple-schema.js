"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var GraphQL = require("graphql");
var schema = new GraphQL.GraphQLSchema({
    query: new GraphQL.GraphQLObjectType({
        name: 'SimpleSchemaType',
        description: 'Simple schema type',
        fields: {
            hello: {
                type: GraphQL.GraphQLString,
            },
        },
    }),
});
function createSimpleSchema() {
    return GraphQL.graphql(schema, GraphQL.introspectionQuery);
}
exports.createSimpleSchema = createSimpleSchema;
//# sourceMappingURL=simple-schema.js.map