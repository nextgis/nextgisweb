define([], function () {
    var entryChunks = undefined;
    var callbacks = [];

    function onload() {
        var entrypoints = JSON.parse(this.responseText).entrypoints || {};

        var tmp = {};
        Object.keys(entrypoints).forEach(function (entry) {
            var value = entrypoints[entry];
            tmp[entry] = ((value.assets || {}).js || []).slice(0, -1).map(function (c) {
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
