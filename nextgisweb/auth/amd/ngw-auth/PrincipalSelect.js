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
            var data = params.filter_ ? principalDump.filter(function (p) {
                for (k in params.filter_) {
                    if (p[k] !== params.filter_[k]) {
                        return false;
                    }
                }
                return true;
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
