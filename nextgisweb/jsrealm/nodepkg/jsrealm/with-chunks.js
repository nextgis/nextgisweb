define([], function () {
    var entryChunks = undefined;
    var callbacks = [];

    function onload() {
        var entrypoints = JSON.parse(this.responseText).entrypoints || {};

        var tmp = {};
        Object.keys(entrypoints).forEach(function (entry) {
            var value = entrypoints[entry];
            // The first chunk is always "chunk/runtime.js", which was already
            // loaded by a script tag, and the last one is the entry, which will
            // be loaded by AMD require loader.
            var chunks = ((value.assets || {}).js || []).slice(1, -1);
            tmp[entry] = chunks.map(function (c) {
                return 'dist/main/' + c.slice(0, -3);
            });
        });

        entryChunks = tmp;
        callbacks.forEach(function (f) { f() });
        // console.debug("Assets manifest has been loaded.", entryChunks);
    }

    var oReq = new XMLHttpRequest();
    oReq.onload = onload;
    oReq.open("get", ngwConfig.distUrl + 'main/assets-manifest.json', true);
    oReq.send();

    return {
        load: function load(entry, require, load) {
            // console.debug("Loading chunks for " + entry + "...");

            function ready() {
                var epchunks = entryChunks[entry];
                require(epchunks, function () {
                    // console.debug("Chunks has been loaded for " + entry + ".", epchunks);
                    load(null);
                });
            };

            if (entryChunks === undefined) {
                // console.debug("Assets manifest has't been loaded yet!");
                callbacks.push(ready);
            } else {
                ready();
            }
        }
    }
})
