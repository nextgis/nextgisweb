define([
    "dojo/_base/declare",
    "dojo/Deferred",
    "dojo/dom-attr",
    "dojo/_base/array",
    "dojo/query",
    "dojo/has",
    "dojo/_base/sniff",
    ngwConfig.assetUrl + "tablesort/tablesort.min.js"
], function (
    declare,
    Deferred,
    domAttr,
    array,
    query,
    has
) {
    var Tablesort = window.Tablesort,
        mids = [];

    if (has("ie")) {
        mids.push(ngwConfig.assetUrl + "polyfills/classList.js");
    }

    return function(node) {
        var deferred = new Deferred(),
            dataattr = "data-sort-method";

        query("[" + dataattr + "]", node).forEach(function (n) {
            var method = domAttr.get(n, dataattr),
                mid = ngwConfig.assetUrl + "tablesort/sorts/tablesort." + method + ".js";

            if (array.indexOf(mids, mid) == -1) {
                mids.push(mid);
            }
        });

        require(mids, function() {
            deferred.resolve(new Tablesort(node));
        });

        return deferred.promise;
    };
});
