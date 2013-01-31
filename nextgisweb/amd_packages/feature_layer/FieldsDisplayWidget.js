define([
    "dojo/_base/declare",
    "./DisplayWidget",
    "dojo/_base/array",
    "put-selector/put",
    // css
    "xstyle/css!./resources/FieldsDisplayWidget.css"
], function (
    declare,
    DisplayWidget,
    array,
    put
) {
    return declare(DisplayWidget, {
        title: "Атрибуты",

        render: function () {
            var widget = this,
                feature = this._feature,
                containerNode = this.containerNode;

            containerNode.innerHTML = "";

            require(
                ["ngw/load-json!layer/" + feature.layerId + "/field/"],
                function (fields) {
                    var tbody = put(
                        containerNode,
                        "table.data.ngwFeatureLayer-fieldTable.ngwFeatureLayer-fieldTable-compact tbody"
                    );

                    array.forEach(fields, function (f) {
                        put(tbody,
                            "tr th.display_name $ < td.value.$ $",
                            f.display_name,
                            "datatype-" + f.datatype,
                            feature.fields[f.keyname]
                        )
                    });
                }
            );
        }
    });
});