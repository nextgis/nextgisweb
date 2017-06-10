/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Deferred",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "ngw/route",
    "ngw/utils/make-singleton",
    "./ResourceStore",
    "./TreeNode"
], function (
    declare,
    lang,
    Deferred,
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

        // Признак того, что загружена корневая нода. Используется вместо
        // оригинального свойства root, которое теперь всегда null. Это сделано
        // для того, чтобы избежать дублирования загрузки корневой ноды в
        // случае, если на странице используется несколько ResourcePicker-ов.
        _root: undefined,

        constructor: function () {
            this._root = new Deferred();
            this.store.query(this.query).then(
                lang.hitch(this, function (items) { this._root.resolve(items[0]); })
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

        // Отключаем множественное выделение по-умолчанию
        dndParams: Tree.prototype.dndParams.concat(["singular"]),
        singular: true,

        constructor: function (kwArgs) {
            declare.safeMixin(this, kwArgs);

            if (this.resourceId === undefined) { this.resourceId = 0; }

            // Все деревья, являющиеся экземплярами данного класса, используют
            // общую модель. Вследствие чего уменьшается количество запросов
            // к серверу, но при этом экземпляры не могут иметь разные
            // корневые ноды. Возможно, это когда-то может понадобиться.
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
