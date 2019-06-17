define([
    "dojo/_base/declare",
    "dijit/form/Select",
    "dojo/_base/array",
    "ngw/load-json!api/component/spatial_ref_sys/"
], function (declare, Select, array, dataSRS) {
    return declare([Select], {
        constructor: function (params) {
            // TODO: Lock SRS widget to EPSG:3857 by default
            this.allSrs = params.allSrs || false;
            var filtered = array.filter(dataSRS, function (itm) {
                return this.allSrs || itm.id == 3857;
            }, this);
            this.options = array.map(filtered, function (itm) {
                return {value: itm.id, label: itm.display_name};
            });
        }
    });
});
