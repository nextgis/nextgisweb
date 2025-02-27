function stripIndex(name) {
    return name.replace(/(?:\/index)?\.(js|tsx?)$/, "");
}

module.exports = { stripIndex };
