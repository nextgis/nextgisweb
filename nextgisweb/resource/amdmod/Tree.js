/* globals declare */
define([
    "dojo/_base/declare",
    "dojo/store/Memory",
    "dojo/store/JsonRest",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "ngw/route",
], function (
    declare,
    Memory,
    JsonRest,
    Tree,
    ObjectStoreModel,
    route
) {
    return declare("ngw.resource.Tree", [Tree], {
        showRoot: false,

        constructor: function (kwArgs) {
            declare.safeMixin(this, kwArgs);

            this.store = new JsonRest({
                target: route("resource.store"),
                headers: { "Accept": "application/json" },
                getChildren: function(object){
                    return this.query({parent_id: object.id});
                }
            });

            this.model = new ObjectStoreModel({
                store: this.store,
                labelAttr: "display_name",
                query: {id: this.resourceId},
                mayHaveChildren: function (item) {
                    return item.children;
                }
            });
        }
    });
});