define([
    "dojo/_base/declare",
    "./DisplayWidget",
    "dojo/request/xhr",
    "dojo/_base/array",
    "put-selector/put",
    "ngw/route",
    // css
    "xstyle/css!./resources/FieldsDisplayWidget.css"
], function (
    declare,
    DisplayWidget,
    xhr,
    array,
    put,
    route
) {
    return declare(DisplayWidget, {
        title: "Атрибуты",

        render: function () {
            var feature = this._feature,
                containerNode = this.containerNode;

            containerNode.innerHTML = "";

            xhr.get(route("feature_layer.field", {id: feature.layerId}), {
                handleAs: "json"
            }).then(function (fields) {
                var tbody = put(
                    containerNode,
                    "table.data.ngwFeatureLayer-fieldTable.ngwFeatureLayer-fieldTable-compact tbody"
                );

                array.forEach(array.filter(fields, function(f){ return f.grid_visibility; }), function (f) {
                    put(tbody,
                        "tr th.display_name $ < td.value.$ $",
                        f.display_name,
                        "datatype-" + f.datatype,
                        feature.fields[f.keyname]
                    );
                });
            });
        }
    });
});