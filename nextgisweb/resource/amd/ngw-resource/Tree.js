/* globals define */
define([
    "dojo/_base/declare",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "ngw/route",
    "./ResourceStore"
], function (
    declare,
    Tree,
    ObjectStoreModel,
    route,
    ResourceStore
) {
    return declare("ngw.resource.Tree", [Tree], {
        showRoot: true,

        // Отключаем множественное выделение по-умолчанию
        dndParams: Tree.prototype.dndParams.concat(["singular"]),
        singular: true,

        constructor: function (kwArgs) {
            declare.safeMixin(this, kwArgs);

            if (this.resourceId === undefined) { this.resourceId = 0; }

            this.store = new ResourceStore();

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