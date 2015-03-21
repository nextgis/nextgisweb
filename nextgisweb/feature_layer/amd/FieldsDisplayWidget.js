define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "put-selector/put",
    "./DisplayWidget"
], function (
    declare,
    array,
    put,
    DisplayWidget
) {
    return declare([DisplayWidget], {
        title: "Атрибуты",
        
        renderValue: function (value) {
            var tbody = put(this.domNode, "table.pure-table.pure-table-horizontal tbody");
            for (var k in value) {
                put(tbody, "tr th.keyname $ < td.value $", k, value[k]);
            }
        }
    });
});