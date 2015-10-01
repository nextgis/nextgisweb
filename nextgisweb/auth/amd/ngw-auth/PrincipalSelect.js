define([
    "dojo/_base/declare",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory",
    "ngw/load-json!auth/principal/dump"
], function (
    declare,
    FilteringSelect,
    Memory,
    principalDump
) {
    return declare([FilteringSelect], {
        preamble: function () {
            this.store = new Memory({
                data: principalDump
            });

            this.searchAttr = "display_name";
        },

        constructor: function (params) {
            this.required = false;

            this.fetchProperties = {
                sort: [{
                    attribute: this.searchAttr,
                    ascending: true
                }]
            };
        },

        _getItemAttr: function () {
            return this.store.get(this.get("value"));
        }
    });
});
