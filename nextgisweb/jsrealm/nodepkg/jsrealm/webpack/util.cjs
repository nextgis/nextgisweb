function injectCode(fn, code) {
    const encoded = encodeURI(code).replace("!", "%21");
    return `imports-loader?additionalCode=${encoded}!${fn}`;
}

function stripIndex(name) {
    return name.replace(/(?:\/index)?\.(js|tsx?)$/, "");
}

function virtualImport(fn, code) {
    const encoded = Buffer.from(code).toString("base64");
    return `${fn}!=!data:text/javascript;base64,${encoded}`;
}

module.exports = { injectCode, stripIndex, virtualImport };
