const crypto = require('crypto');

/**
 * Processes the shardKey options a function for the default value
 * @param {*} shardKeyOptions - The options for the shardKey
 * @returns {Function} - the generator function for the default
 */
function processShardKeyOptions(shardKeyOptions) {
    let segments = [];

    if (!shardKeyOptions) {
        segments.push(hashProperty('_id'));
    }
    else if (shardKeyOptions instanceof Array) {
        if (random.test(shardKeyOptions))
            segments.push(random(shardKeyOptions[1]));

        else if (property.test(shardKeyOptions))
            segments.push(property(shardKeyOptions[1], shardKeyOptions[2]));

        else if (hashProperty.test(shardKeyOptions))
            segments.push(hashProperty(shardKeyOptions[1], shardKeyOptions[2]));

        else if (hashFunction.test(shardKeyOptions))
            segments.push(hashFunction(shardKeyOptions[1], shardKeyOptions[2]));

        else
            segments = shardKeyOptions.reduce(function (val, option) {
                val.push(determineGenerator(option));
                return val;
            }, [])
    }
    else
        segments.push(determineGenerator(shardKeyOptions));

    return function () {
        return segments.reduce((shardKey, segment) => {
            return shardKey +
                (segment instanceof Function ? segment.call(this) : segment);
        }, '')
    }
}


exports.processShardKeyOptions = processShardKeyOptions;


/**
 * Determines how to generate a segment of the shard key
 * @param {*} option - the option for this segement of the shard key
 * @returns {Function|String|Number} returns the method of generating the 
 */
function determineGenerator(option) {
    if (option instanceof Function ||
        typeof option === 'string' ||
        typeof option === 'number')
        return option

    if (option instanceof Array) {
        if (random.test(option))
            return random(option[1]);

        if (property.test(option))
            return property(option[1]);

        if (hashProperty.test(option))
            return hashProperty(option[1], option[2]);


        if (hashFunction.test(option))
            return hashFunction(option[1], option[2]);
    }

    return '';
}

/**
 * Generates random characters
 * @param {Number} length - The number of random characters to generate. Default: 6
 * @returns {Function} a function that generates the specified amount of random characters
 */
function random(length) {
    length = ensureDefaultLength(length);
    return function () {
        return crypto
            .randomBytes(Math.round(length / 2))
            .toString('hex')
            .substr(0, length);
    }
}

/**
 * Test if this is a random
 * @param {Array} shardKeyOption
 * @returns {Boolean}
 */
random.test = (shardKeyOption) =>
    shardKeyOption instanceof Array && (
        shardKeyOption[0] === 'random' ||
        shardKeyOption[0] === 'rand' ||
        shardKeyOption[0] === 'r');

/**
 * Hashes a property
 * @param {String} propertyName - The name of the document property
 * @param {Number} length - The number of random characters to generate. Default: 6
 * @returns {Function} a function that returns the specified characters of the property hash
 */
function hashProperty(propertyName, length) {
    length = ensureDefaultLength(length);

    return function () {
        return crypto
            .createHash('sha1')
            .update('' + this.get(propertyName))
            .digest('hex')
            .substr(0, length);
    }
}

/**
 * Test if this is a hash property
 * @param {Array} shardKeyOption
 * @returns {Boolean}
 */
hashProperty.test = (shardKeyOption) =>
    shardKeyOption instanceof Array && (
        shardKeyOption[0] === 'hashProperty' ||
        shardKeyOption[0] === 'hashProp' ||
        shardKeyOption[0] === 'hp');

/**
 * Hashes the result of a function
 * @param {Function} valueGenerator - A function that returns the value to hash
 * @param {Number} length - The number of random characters to generate. Default: 6
 * @returns {Function} a function that returns the specified characters of the property hash
 */
function hashFunction(valueGenerator, length) {
    length = ensureDefaultLength(length);

    if (typeof valueGenerator !== 'function') throw new Error('Hash function requires a function as an input')

    return function () {
        return crypto
            .createHash('sha1')
            .update('' + valueGenerator.call(this))
            .digest('hex')
            .substr(0, length);
    }
}

/**
 * Test if this is a hash function
 * @param {Array} shardKeyOption
 * @returns {Boolean}
 */
hashFunction.test = (shardKeyOption) =>
    shardKeyOption instanceof Array && (
        shardKeyOption[0] === 'hashFunction' ||
        shardKeyOption[0] === 'hashFn' ||
        shardKeyOption[0] === 'hf');

/**
 * Hashes a property
 * @param {String} propertyName - The name of the document property
 * @returns {Function} a function that returns the property name
 */
function property(propertyName, length) {
    length = ensureDefaultLength(length, propertyName.length);
    return function () {
        let prop = this.get(propertyName);
        return typeof prop === 'string'
            ? prop.substr(0, length)
            : prop;
    }
}

/**
 * Test if this is a property
 * @param {Array} shardKeyOption
 * @returns {Boolean}
 */
property.test = (shardKeyOption) =>
    shardKeyOption instanceof Array && (
        shardKeyOption[0] === 'property' ||
        shardKeyOption[0] === 'prop' ||
        shardKeyOption[0] === 'p');


function ensureDefaultLength(length, def = 6) {
    return Number.isFinite(length || NaN)
        ? length
        : def;
}