/* globals define */
define([
    "dojo/_base/declare",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "ngw/route",
    "ngw/utils/make-singleton",
    "./ResourceStore",
    "./TreeNode"
], function (
    declare,
    Tree,
    ObjectStoreModel,
    route,
    makeSingleton,
    ResourceStore,
    TreeNode
) {

    var ResourceObjectStoreModel = makeSingleton(declare([ObjectStoreModel], {
        store: new ResourceStore(),
        labelAttr: "display_name",
        mayHaveChildren: function (item) {
            return item.children;
        }
    }));

    return declare("ngw.resource.Tree", [Tree], {
        showRoot: true,

        // Отключаем множественное выделение по-умолчанию
        dndParams: Tree.prototype.dndParams.concat(["singular"]),
        singular: true,

        constructor: function (kwArgs) {
            declare.safeMixin(this, kwArgs);

            if (this.resourceId === undefined) { this.resourceId = 0; }

            this.model = ResourceObjectStoreModel.getInstance({
                query: {id: this.resourceId}
            });
            this.store = this.model.store;
        },

        getIconClass: function (item, opened) {
            return;
        },

        _createTreeNode: function (args) {
            return new TreeNode(args);
        }
    });
});
