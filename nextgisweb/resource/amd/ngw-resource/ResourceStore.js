/* globals define */
define([
    "dojo/_base/declare",
    "dojo/store/JsonRest",
    "dojo/_base/array",
    "ngw/route"
], function (
    declare,
    JsonRest,
    array,
    route
) {
    return declare("ngw.resource.ResourceStore", [JsonRest], {
        target: route.resource.collection(),
        headers: { "Accept": "application/json" },
        getChildren: function(object){
            return this.query({parent: object.id}).then(function(response) {
                var resources = [];
                array.forEach(response, function(item) {
                    resources.push(item.resource);
                });
                return resources;
            });
        }
    });
});
