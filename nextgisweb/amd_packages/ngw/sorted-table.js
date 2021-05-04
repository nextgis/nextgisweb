define(["@nextgisweb/pyramid/tablesort"], function (tablesort) {
    console.warn(
        "The module \"ngw/sorted-table\" is deprecated! Use " +
        "\"@nextgisweb/pyramid/tablesort\" instead."
    );
    return function(node) { tablesort.default(node) };
});
