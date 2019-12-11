// copy of mongoose getOption
exports.getOption = function (name) {
    const sources = Array.prototype.slice.call(arguments, 1);

    for (const source of sources) {
        if (source[name] != null) {
            return source[name];
        }
    }

    return null;
};