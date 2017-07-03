/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "ngw/utils/make-singleton",
    "./ResourceStore",
    "./TreeNode"
], function (
    declare,
    lang,
    Deferred,
    Tree,
    ObjectStoreModel,
    makeSingleton,
    ResourceStore,
    TreeNode
) {

    var ResourceObjectStoreModel = makeSingleton(declare([ObjectStoreModel], {
        store: new ResourceStore(),

        labelAttr: "display_name",

        // Indication that root node is loaded. Used instead of 
        // original root property, which is always null now. This is done
        // to avoid double root node loading
        // when a page uses several ResourcePicker
        _root: undefined,

        constructor: function () {
            this._root = new Deferred();
            this.store.query(this.query).then(
                lang.hitch(this, function (items) { this._root.resolve(items[0].resource); })
            );
        },

        getRoot: function (onItem, onError) {
            this._root.promise.then(onItem, onError);
        },

        mayHaveChildren: function (item) {
            return item.children;
        }
    }));

    return declare("ngw.resource.Tree", [Tree], {
        showRoot: true,

        // Turn off multiple selection by defaul
        dndParams: Tree.prototype.dndParams.concat(["singular"]),
        singular: true,

        constructor: function (kwArgs) {
            declare.safeMixin(this, kwArgs);

            if (this.resourceId === undefined) { this.resourceId = 0; }

            // All trees that are exemplars of this class use
            // the same model. As a result there are less requests
            // to server, but exemplars can't have different 
            // root nodes. This might become useful sometimes.
            this.model = ResourceObjectStoreModel.getInstance();
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
