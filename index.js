const _ = require('lodash');
const generators = require('./src/generators');
const getOption = require('./src/utils').getOption;
const indexes = require('./src/indexes');

function cosmosDbPlugin(schema) {
    // This updates index gathering so that it works smoother with Cosmos DB
    // it will run once and handles itself
    //indexes.updateGetIndexes(schema);

    const shardKey = schema.options.shardKey;

    if (shardKey) {

        // console.log(schema.indexes())
        // process.exit();

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

        schema.pre('save', function (next) {
            const model = this.constructor;
            const partitionDetails = model.schema.$partition;

            if (partitionDetails &&
                !partitionDetails.collectionExists &&
                !partitionDetails.checking
            ) {
                partitionDetails.checking = true;

                const db = model.db.db;
                const dbName = model.db.name;
                const collectionName = model.collection.collectionName;
                const autoIndex = false && getOption('autoIndex',
                    model.schema.options, model.db.config, model.db.base.options)

                // https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-define-unique-keys
                let opts = {
                    shardCollection: `${dbName}.${collectionName}`,
                    key: {},
                    uniqueKeyCollection: {
                        uniqueKeys: [
                            {
                                paths: ['/name, /shardKey'],
                            },
                        ]
                    }

                }

                opts.key[partitionDetails.key] = 'hashed';

                partitionDetails.postCheckCallbacks.push(next);

                const allNexts = function (err) {
                    if (err) partitionDetails.postCheckCallbacks[0](err)
                    err = 'See Previous Error'
                    partitionDetails.postCheckCallbacks.forEach(cb => cb(err))
                    partitionDetails.postCheckCallbacks.length = 0;
                }

                db.listCollections({ name: collectionName })
                    .next(function (err, collinfo) {
                        if (err) return allNexts(err);

                        if (collinfo) {
                            partitionDetails.collectionExists = true;
                            return allNexts();
                        }

                        return db.command(opts)
                            .then(() => {
                                return setTimeout(() =>
                                    db.createIndex('submittableaccounts', { name: 1, shardKey: 1 }, { unique: true })
                                        .then(() => allNexts())
                                        .catch(allNexts), 300000);
                                // process.exit();

                                partitionDetails.collectionExists = true;
                                return autoIndex
                                    ? model.ensureIndexes({ _automatic: true }, allNexts)
                                    : allNexts();
                            })
                            .catch(allNexts);

                    });
            }
            else if (partitionDetails && partitionDetails.checking) {
                partitionDetails.postCheckCallbacks.push(next);
            }
            else
                next();
        })

        // schema.on('init', function (model) {
        //     let partitionKey = model.schema.$partitionKey;

        //     if (partitionKey) {
        //         const db = model.db.db;

        //         const collection = db.listCollections({ name: model.collection.collectionName })
        //             .next(function (err, collinfo) {
        //                 if (collinfo) {
        //                     // The collection exists
        //                 }
        //             });

        //         console.log(collection);


        //         let innerCreateCollection = model.createCollection;

        //         model.createCollection = function (options, callback) {
        //             console.log('hey?')
        //             if (typeof options === 'function') {
        //                 callback = options;
        //                 options = {};
        //             }

        //             options.partitionKey = partitionKey;

        //             cb = function () {
        //                 console.log('Callback!')
        //                 return callback();
        //             }

        //             let opts = {
        //                 shardCollection: `${model.collection.collectionName}`,
        //                 key: {}
        //             }

        //             opts.key[partitionKey] = 'hashed';


        //             console.log(opts)
        //             process.exit();
        //             model.db.db.command(opts, callback)

        //         }
        //     }
        // })
    }



    // SubmittableAccountSchema.on('init', function (model) {
    //     // Cosmos: Create container command:
    //     // https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-create-container#dotnet-mongodb

    //     // Schema option: shardKey
    //     // https://mongoosejs.com/docs/guide.html#shardKey

    //     // Schema: set option (set autoCreate to false)
    //     // https://mongoosejs.com/docs/api/schema.html#schema_Schema-set

    //     console.log('------------------------------------------------');
    //     console.log('');
    //     console.log(model.schema.obj);
    //     console.log('');
    //     console.log(model.db.db.command, {
    //         shardCollection: `${model.db.name}.${model.collection.collectionName}`,
    //         key: model.schema.options.shardKey
    //     });
    //     console.log('');
    //     console.log('');
    //     process.exit();
    // })
}

module.exports = cosmosDbPlugin;