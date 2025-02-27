function injectCode(fn, code) {
    const encoded = encodeURI(code).replace("!", "%21");
    return `imports-loader?additionalCode=${encoded}!${fn}`;
}

function stripIndex(name) {
    return name.replace(/(?:\/index)?\.(js|tsx?)$/, "");
}

module.exports = { injectCode, stripIndex };
