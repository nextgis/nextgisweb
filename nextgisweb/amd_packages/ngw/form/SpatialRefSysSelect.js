define([
    "dojo/_base/declare",
    "dijit/form/Select"
], function (declare, Select) {
    return declare([Select], {

        preamble: function (kwArgs) {
            kwArgs.options = [
                {label: "WGS 84 / Lon-lat (EPSG:4326)", value: 4326},
                {label: "WGS 84 / Pseudo-Mercator (EPSG:3857)", value: 3857},
            ];
        }
    });
});