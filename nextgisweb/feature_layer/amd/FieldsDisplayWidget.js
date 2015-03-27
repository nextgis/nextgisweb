define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/date/locale",
    "put-selector/put",
    "./DisplayWidget"
], function (
    declare,
    array,
    locale,
    put,
    DisplayWidget
) {
    return declare([DisplayWidget], {
        title: "Атрибуты",

        renderValue: function (value) {
            var tbody = put(this.domNode, "table.pure-table.pure-table-horizontal tbody");

            for (var k in value) {
                var val = value[k];
                var field = this.fields[k];

                if (field.datatype == 'DATE') {
                    val = locale.format(new Date(val.year, val.month, val.day), {
                        selector: "date",
                        formatLength: "medium"
                    });
                } else if (field.datatype == 'TIME') {
                    val = locale.format(new Date(0, 0, 0, val.hour, val.minute, val.second), {
                        selector: "time",
                        formatLength: "medium"
                    });
                } else if (field.datatype == 'DATETIME') {
                    val = locale.format(new Date(val.year, val.month, val.day, val.hour, val.minute, val.second), {
                        formatLength: "medium"
                    });
                }

                put(tbody, "tr th.keyname $ < td.value $", k, val);
            }
        }
    });
});
