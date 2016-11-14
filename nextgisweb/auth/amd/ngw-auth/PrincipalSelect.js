define([
    "dojo/_base/declare",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory",
    "dojo/_base/lang",
    "ngw/load-json!auth/principal/dump"
], function (
    declare,
    FilteringSelect,
    Memory,
    lang,
    principalDump
) {
    return declare([FilteringSelect], {
        preamble: function () {
            this.store = new Memory({
                data: principalDump
            });

            this.searchAttr = "display_name";
        },

        labelFunc: function (item, store) {
            return lang.replace("<span class='icon-{class}'></span> {label}", {
                class: {"U": "user", "G": "users"}[item.cls],
                label: item[this.searchAttr]
            });
        },

        constructor: function (params) {
            this.required = false;

            this.labelType = "html";

            this.fetchProperties = {
                sort: [{
                    attribute: "cls",
                    ascending: true,
                }, {
                    attribute: this.searchAttr,
                    ascending: true
                }]
            };
        }
    });
});
