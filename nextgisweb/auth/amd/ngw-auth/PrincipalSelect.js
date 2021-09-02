define([
    "dojo/_base/declare",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory",
    "dojo/_base/lang",
    "@nextgisweb/pyramid/api/load!auth/principal/dump"
], function (
    declare,
    FilteringSelect,
    Memory,
    lang,
    principalDump
) {
    return declare([FilteringSelect], {
        preamble: function (params) {
            var data = params.cls ? principalDump.filter(function (p) {
                return p.cls === params.cls
            }) : principalDump;

            this.store = new Memory({
                data: data
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
