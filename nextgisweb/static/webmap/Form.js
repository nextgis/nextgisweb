define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/aspect",
    "dojo/request/xhr",
    "dojo/json",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Form.html",
    "dojo/data/ItemFileWriteStore",
    "dijit/tree/ForestStoreModel",
    "dijit/tree/TreeStoreModel",
    "dojo/store/Memory",
    "dijit/tree/ObjectStoreModel",
    "dojo/store/Observable",
    "dojo/on",
    "dijit/Tree",
    "dijit/tree/dndSource",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojox/layout/TableContainer",
    "dijit/layout/StackContainer",
    "dijit/Toolbar",
    "dijit/Dialog",
    "layer/LayerTree"
], function(declare, array, aspect, xhr, json, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, ItemFileWriteStore, ForestStoreModel, TreeStoreModel, Memory, ObjectStoreModel, Observable, on, Tree, dndSource) {
    return declare("webmap.Form", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function (options) {
            this.itemStore = new ItemFileWriteStore({
                data: {items: [options.data.root_item ]}
            });

            this.itemModel = new TreeStoreModel({
                store: this.itemStore,
                query: {}
            });

            this.widgetTree = new Tree({
                model: this.itemModel,
                showRoot: false,
                getLabel: function (item) { return item.display_name; },
                getIconClass: function(item, opened){
                    return item.item_type == 'group' ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "dijitLeaf";
                },
                dndController: dndSource,
                betweenThreshold: 5,
                persist: false
            });
        },

        postCreate: function () {
            // создать дерево без model не получается, поэтому создаем его вручную
            this.widgetTree.placeAt(this.containerTree).startup();

            var widget = this;

            // добавление новой группы
            on(this.btnAddGroup, "click", function () {
                widget.itemStore.newItem(
                    {
                        display_name: "Новая группа",
                        item_type: "group"
                    }, {
                        parent: widget.getAddParent(),
                        attribute: "children"    
                    }
                );
            });

            // добавление нового слоя
            on(this.btnAddLayer, "click", function () {
                widget.dlgAddLayer.show();
            });

            // удаление слоя или группы
            on(this.btnDeleteItem, "click", function() {
                widget.itemStore.deleteItem(widget.widgetTree.selectedItem);
            });

            on(this.widgetTree, "click", function (item) {
                widget.widgetItemDisplayName.setValue(item.display_name);
                if (widget.widgetTree.selectedItem.item_type == "group") {
                    widget.widgetProperties.selectChild(widget.paneGroup);
                    widget.widgetItemGroupExpanded.setValue(widget.itemStore.getValue(item, "group_expanded"));
                } else if (widget.widgetTree.selectedItem.item_type == "layer") {
                    widget.widgetProperties.selectChild(widget.paneLayer);
                    widget.wdgtItemLayerEnabled.setValue(widget.getItemValue("layer_enabled"));
                };
            });

            on(this.widgetItemDisplayName, "change", function (evt) {
                widget.setItemValue("display_name", widget.widgetItemDisplayName.value);
            });

            on(this.widgetItemGroupExpanded, "change", function () {
                widget.setItemValue("group_expanded", widget.widgetItemGroupExpanded.value);
            });

            on(this.wdgtItemLayerEnabled, "change", function () {
                widget.setItemValue("layer_enabled", widget.wdgtItemLayerEnabled.value);
            });

            on(this.wgtLayer, "click", function (item) {
                widget.btnDlgAddLayer.setDisabled(item.type != 'style');
            });

            on(this.btnDlgAddLayer, "click", function() {
                widget.itemStore.newItem(
                    {
                        "item_type": "layer",
                        "display_name": widget.wgtLayer.selectedItem.display_name,
                        "layer_style_id": widget.wgtLayer.selectedItem.id
                    }, {
                        parent: widget.getAddParent(),
                        attribute: "children"    
                    }
                );
                widget.dlgAddLayer.hide();
            });

            on(this.btnSave, "click", function() {
                xhr(application_url + '/api/webmap/' + widget.id, {
                    data: json.stringify(widget.getData()),
                    method: "PUT",
                    handleAs: "json"
                });
            });
        },

        getAddParent: function () {
            if (this.getItemValue("item_type") == "group") {
                return this.widgetTree.selectedItem;
            } else {
                return this.itemModel.root;
            }
        },

        setData: function (data) {
            this.id = data.id;
            this.widgetDisplayName.setValue(data.display_name);
        },

        
        getData: function () {
            var widget = this;

            // простого способа сделать дамп данных из itemStore
            // почему-то нет, поэтому обходим рекурсивно
            function traverseItem(itm) {
                return {
                    item_type: widget.itemStore.getValue(itm, "item_type"),
                    display_name: widget.itemStore.getValue(itm, "display_name"),
                    group_expanded: widget.itemStore.getValue(itm, "group_expanded"),
                    layer_style_id: widget.itemStore.getValue(itm, "layer_style_id"),
                    layer_enabled: widget.itemStore.getValue(itm, "layer_enabled"),
                    children: array.map(widget.itemStore.getValues(itm, "children"), function (i) { return traverseItem(i) })
                }
            }

            return {
                display_name: this.widgetDisplayName.value,
                root_item: traverseItem(this.itemModel.root)
            };
        },

        // установить значение аттрибута текущего элемента
        setItemValue: function (attr, value) {
            this.itemStore.setValue(this.widgetTree.selectedItem, attr, value);
        },

        // значение аттрибута текущего элемента
        getItemValue: function (attr) {
            if (this.widgetTree.selectedItem) {
                return this.itemStore.getValue(this.widgetTree.selectedItem, attr);
            };
        }
    });
});