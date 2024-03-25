define(["dojo/_base/declare", "./_Base"], function (
    declare,

    _Base
) {
    return declare([_Base], {
        olLayerClassName: "layer.Tile",
        olSourceClassName: "source.XYZ",

        constructor: function () {
            this.inherited(arguments);
        },

        _symbolsSetter: function (value) {
            this.inherited(arguments);

            var urls = this.olSource.getUrls();
            if (urls && urls.length > 0) {
                var updatedUrls = urls.map((url) =>
                    this._updateUrl(url, value)
                );
                this.olSource.setUrls(updatedUrls);
            }
        },

        _updateUrl: function (src, value) {
            const url = new URL(src, window.location.href);
            const params = url.search
                .slice(1)
                .split("&")
                .reduce((acc, curr) => {
                    const [key, val] = curr.split("=").map(decodeURIComponent);
                    acc[key] = val;
                    return acc;
                }, {});

            const resource = params["resource"];
            const symbolsKey = `symbols[${resource}]`;

            if (value) {
                params[symbolsKey] = value !== "-1" ? value : "";
            } else {
                delete params[symbolsKey];
            }

            const queryString = Object.keys(params)
                .map((key) => {
                    const val = params[key];
                    return `${key}=${val}`;
                })
                .join("&");

            url.search = queryString;
            return url.href;
        },
    });
});
