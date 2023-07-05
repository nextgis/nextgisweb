define([], function () {
    let dependencies = undefined;
    const postponed = [];

    function onload() {
        dependencies = JSON.parse(this.responseText).dependencies || {};
        postponed.forEach(function (fn) {
            fn();
        });
    }

    const oReq = new XMLHttpRequest();
    oReq.onload = onload;
    oReq.open("get", ngwConfig.staticUrl + "main/manifest.json", true);
    oReq.send();

    return {
        load(entry, require, callback) {
            function doLoad() {
                const deps = dependencies[entry];
                if (deps === undefined || deps === []) {
                    callback(null);
                } else {
                    require(deps.map((itm) => "main/" + itm), function () {
                        callback(null);
                    });
                }
            }

            if (dependencies === undefined) {
                postponed.push(doLoad);
            } else {
                doLoad();
            }
        },
    };
});
