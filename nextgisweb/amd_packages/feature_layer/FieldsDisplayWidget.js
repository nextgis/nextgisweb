define([
    "dojo/_base/declare",
    "./DisplayWidget",
    "dojo/_base/array",
    "put-selector/put"
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
                        "table thead tr th $ < th $ <<< tbody",
                        "Атрибут", "Значение"
                    );

                    array.forEach(fields, function (f) {
                        put(tbody,
                            "tr th $ < td $",
                            f.display_name,
                            feature.fields[f.keyname]
                        )
                    });
                }
            );
        }
    });
});