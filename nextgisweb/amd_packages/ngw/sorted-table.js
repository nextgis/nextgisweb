define([
    "dojo/_base/declare",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/has",
    "dojo/_base/sniff",
    ngwConfig.assetUrl + "tablesort/tablesort.min.js"
], function (
    declare,
    domAttr,
    query,
    has
) {
    var Tablesort = window.Tablesort,
        requirements = [];

    if (has("ie")) {
        requirements.push(ngwConfig.assetUrl + "polyfills/classList.js");
    }

    return function(node) {
        var dataattr = "data-sort-method";
        query("[" + dataattr + "]", node).forEach(function (n) {
            var method = domAttr.get(n, dataattr);
            requirements.push(ngwConfig.assetUrl + "tablesort/sorts/tablesort." + method + ".js");
        });

        require(requirements, function() {
            new Tablesort(node);
        });
    }
});
