define([
    "dojo/_base/declare",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory",
    "../load-json!layer/store_api"
], function (
    declare,
    FilteringSelect,
    Memory,
    layerData
) {
    return declare([FilteringSelect], {
        preamble: function () {
            this.store = new Memory({
                data: layerData
            });

            this.searchAttr = 'display_name';
        },

        constructor: function (params) {
            this.required = false;
        }
    });
});
