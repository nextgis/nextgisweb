define([
    "dojo/_base/declare",
    "dijit/form/Select",
    "dojo/_base/array",
    "ngw/settings!spatial_ref_sys"
], function (declare, Select, array, settings) {
    return declare([Select], {

        constructor: function (params) {
            this.options = array.map(settings.srs, function (itm) {
                return {value: itm.id, label: itm.displayName}
            });
        }
    });
});