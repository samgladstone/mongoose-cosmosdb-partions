
# NOTE

I have pushed the half finished code as I had to give up due to it seemingly not being possible to create unique indexes on collections. I'll return to this if I can later

The master branch just has the shard key helper, fuller-version contains where I got to

# TODO

* A lot of tidying/code restructing
* Indexes creation should only happen for unique indexes and compound indexes, other indexes get managed automatically.

# mongoose-cosmosdb-partions

## Install

Install via npm

```
$ npm i mongoose-cosmosdb-partions
```

Then, register it as a [Global Plugin](https://mongoosejs.com/docs/plugins.html#global):

```js
const mongoose = require('mongoose');
mongoose.plugin(require('mongoose-cosmosdb-partions'));
```

As the plugin looks for the Schema option [shardKey](https://mongoosejs.com/docs/guide.html#shardKey), registering it as a global plugin is fine if you have both partitioned and unpartitioned collections, just don't define a shardKey for collections that aren't partitioned. However, you can also register it as a plugin for particular Schemas:

```js
const schemaPartitions = require('mongoose-cosmosdb-partions');

const userSchema = new Schema({ ... }, { shardKey: { _sk: 1 } });
userSchema.plugin(schemaPartitions);

```

Just make sure to do this before creating your models.


## Configuration

When creating a schema, specify the [shardKey](https://mongoosejs.com/docs/guide.html#shardKey) as part of the options:


```js
const userSchema = new Schema({ ... }, { shardKey: { _sk: 1 } });
```

The name of this key will be used as the partition key. The way the key will be generated is determined by options specified when creating the schema. 

For more info about choosing a partition key, see the [Microsoft Docs](https://docs.microsoft.com/en-us/azure/cosmos-db/partitioning-overview#choose-partitionkey).

### Plugin Generated Synthetic KeyKey

The plugin has helper methods for generating keys, these can be accessed by adding specifying shardKey options in the SchemaType. For example:

```js
const userSchema = new Schema({
        _sk: {
            type: String,
            shardKey: { 
                random: 6
            }
        }
        ... 
    }, {
        shardKey: { _sk: 1 } 
    });
```

See [Generating Partion Keys](#Generating-Partion-Keys) for more info.

NOTE: these will not be generated if you specify your own default value/function.

### Natural or App Generated Synthetic Key

If a the shardKey is added to the schema, but none of the above options were specified, generation of the key is left to the application (typically by defining a default - see [SchemaTypes](https://mongoosejs.com/docs/schematypes.html) for more info). For example:

```
const userSchema = new Schema({
        _sk: {
            type: String,
            default: 'abc'
        }
        ... 
    }, {
        shardKey: { _sk: 1 } 
    });
```

### No Specified Key

If they key was not defined on the schema, then one will be added. It will be generated by taking the first 6 characters of the hash of the ``_id``.


## Generating Partion Keys

The plugin can be used to create default functions to help with 

Note, that this uses the default function and will not work if you specify your own default

### Segment Options:

The below are valid options for a segement:

* `String` - the value will be used as a constant.
* `Number` - the value will be used as a constant.
* `Function` - the return value of the function will be used.
* `Array: [opt1, opt2, opt3] ` - where `opt1` is equal to:
    * `'property' || 'prop' || 'p'` - the document property accessed using `opt2` . `opt3` can be used to specify the first x characters if the property is a string.
     * `'hashProperty' || 'hashProp' || 'hp'` - the hash of the document property accessed using `opt2`. The first `opt3` characters will be used (or `6` characters if `opt3` is not defined).
     * `'hashFunction' || 'hashFn' || 'hf'` - the hash return value of the function passed in as `opt2`. The first `opt3` characters will be used (or `6` characters if `opt3` is not defined).
        * In the function, `this` will refer to the document instance
     * `'random' || 'rand' || 'r'` - a random string will be used of length `opt2` (or `6` characters if `opt2` is not defined).
* All other values will result in an empty string

#### Example

```js
const userSchema = new Schema({
        username: String,
        userType: String,
        created: {
            type: Date,
            default: Date.now
        },
        _sk: {
            type: String,
            shardKey: [
                ['prop', 'userType'],
                '-',
                function () { return this.created.getFullYear(); },
                { something: 'else' },
                ['hash', 'username', 4],
            ]
        }
        ... 
    }, {
        shardKey: { _sk: 1 } 
    });

const User = mongoose.model('User', userSchema);

const jenny = new User({
    username: 'Jenny',
    userType: 'Admin',
})

// jenny._sk: 'Admin-2019eabe'

const richard = new User({
    username: 'Richard',
    userType: 'Basic',
    created: new Date(2000, 01)
})

// richard._sk: 'Basic-2000efac'

```

