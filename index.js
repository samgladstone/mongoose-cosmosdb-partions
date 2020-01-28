const _ = require('lodash');
const generators = require('./src/generators');

function cosmosDbPlugin(schema) {
    const shardKey = schema.options.shardKey;

    if (shardKey) {
        const keys = _.keys(shardKey)

        if (!_.isObject(shardKey) || keys.length > 1)
            throw new Error("Cosmos DB expects a single shard key")


        schema.$partition = {
            key: keys[0],
            checking: false,
            postCheckCallbacks: [],
        }

        const shardKeySchemaType = schema.path(keys[0]);

        // Either no key is specified or there is no default value
        // and there are instructions for generating a key
        if (!shardKeySchemaType
            || (!shardKeySchemaType.defaultValue
                && shardKeySchemaType.options.shardKey)) {
            const shardKeyOptions = shardKeySchemaType ? shardKeySchemaType.options.shardKey : null;
            const generatingFunction =
                generators.processShardKeyOptions(shardKeyOptions);

            if (shardKeySchemaType)
                shardKeySchemaType.default(generatingFunction);
            else {
                const newShardKey = {}
                props[shardKey] = {
                    type: String,
                    default: generatingFunction,
                }

                schema.add(newShardKey);
            }

        }

        // The auto create option messes things up
        schema.set('autoCreate', false);
        schema.set('autoIndex', false);
    }
}

module.exports = cosmosDbPlugin;