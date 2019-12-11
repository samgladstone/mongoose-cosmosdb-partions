let updated = false

function updateGetIndexes(schema) {
    if (!updated) {
        updated = true;

        const getIndexes = schema.indexes;

        schema.indexes = function () {
            const indexes = getIndexes.call(this);

            return updateIndexes.call(this, indexes);
        }
    }
}


function updateIndexes(indexes) {
    indexes.forEach(index => {
        if (index && index[1].unique && this.$partition) {
            index[0][this.$partition.key] = 1;
        }
    })

    console.log(indexes);
    return indexes;
}

exports.updateGetIndexes = updateGetIndexes;
exports.updateIndexes = updateIndexes;