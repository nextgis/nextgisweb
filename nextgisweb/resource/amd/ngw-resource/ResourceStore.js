/* globals define */
define([
    "dojo/_base/declare",
    "dojo/store/JsonRest",
    "ngw/route"
], function (
    declare,
    JsonRest,
    route
) {
    return declare("ngw.resource.ResourceStore", [JsonRest], {
        target: route.resource.store({id: ""}),
        headers: { "Accept": "application/json" },
        getChildren: function(object){
            return this.query({parent_id: object.id});
        }
    });
});