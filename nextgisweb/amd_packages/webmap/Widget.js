define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "ngw/modelWidget/ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    "dojo/_base/array",
    "dojo/data/ItemFileWriteStore",
    "dijit/tree/TreeStoreModel",
    "dijit/Tree",
    "dijit/tree/dndSource",
    // template
    "dijit/layout/TabContainer",
    "dojox/layout/TableContainer",
    "dijit/layout/BorderContainer",
    "dijit/layout/StackContainer",
    "dijit/layout/ContentPane",
    "dijit/Dialog",
    "dijit/Toolbar",
    "ngw/form/DisplayNameTextBox",
    "ngw/form/LayerSelect",
    "ngw/form/ScaleTextBox",
    "dijit/form/TextBox",
    "dijit/form/CheckBox",
    "dijit/form/NumberTextBox",
    "dijit/_WidgetBase",
    "layer/LayerTree"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    ItemFileWriteStore,
    TreeStoreModel,
    Tree,
    dndSource
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function (options) {
            this.value = options.value;

            var items = options.value ? options.value.root_item : {item_type: "root"};
            this.itemStore = new ItemFileWriteStore({
                data: {items: [items]}
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
            this.inherited(arguments);

            if (this.value) {
                this.wDisplayName.set("value", this.value.display_name);
                this.wBookmarkLayer.set("value", this.value.bookmark_layer_id);
                this.wExtentLeft.set("value", this.value.extent[0]);
                this.wExtentBottom.set("value", this.value.extent[1]);
                this.wExtentRight.set("value", this.value.extent[2]);
                this.wExtentTop.set("value", this.value.extent[3]);
            };

            // Создать дерево без model не получается, поэтому создаем его вручную
            this.widgetTree.placeAt(this.containerTree).startup();

            var widget = this;

            // Добавление новой группы
            this.btnAddGroup.on("click", function () {
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

            // Добавление нового слоя
            this.btnAddLayer.on("click", function () {
                widget.dlgAddLayer.show();
            });

            // Удаление слоя или группы
            this.btnDeleteItem.on("click", function() {
                widget.itemStore.deleteItem(widget.widgetTree.selectedItem);
            });

            this.widgetTree.watch("selectedItem", function (attr, oldValue, newValue) {
                // При изменении выделенного элемента перенесем значения в виджеты
                // и покажем нужную панель: для слоев одну, для групп другую.
                widget.widgetItemDisplayName.set("value", widget.getItemValue("display_name"));
                
                if (newValue.item_type == "group") {
                    widget.widgetProperties.selectChild(widget.paneGroup);
                    widget.widgetItemGroupExpanded.set("checked", widget.getItemValue("group_expanded"));
                } else if (newValue.item_type == "layer") {
                    widget.widgetProperties.selectChild(widget.paneLayer);
                    widget.wdgtItemLayerEnabled.set("checked", widget.getItemValue("layer_enabled"));
                    widget.wLayerMinScale.set("value", widget.getItemValue("layer_min_scale"));
                    widget.wLayerMaxScale.set("value", widget.getItemValue("layer_max_scale"));
                };
            });

            // При изменении значений переносим их в модель
            this.widgetItemDisplayName.watch("value", function (attr, oldValue, newValue) {
                widget.setItemValue("display_name", newValue);
            });

            // NB: Именно "checked", "value" не работает
            this.widgetItemGroupExpanded.watch("checked", function (attr, oldValue, newValue) {
                widget.setItemValue("group_expanded", newValue);
            });

            // NB: Именно "checked", "value" не работает
            this.wdgtItemLayerEnabled.watch("checked", function (attr, oldValue, newValue) {
                widget.setItemValue("layer_enabled", newValue);
            });

            this.wLayerMinScale.watch("value", function (attr, oldVal, newVal) {
                widget.setItemValue("layer_min_scale", newVal);
            });

            this.wLayerMaxScale.watch("value", function (attr, oldVal, newVal) {
                widget.setItemValue("layer_max_scale", newVal);
            });

            this.wgtLayer.on("click", function (item) {
                widget.btnDlgAddLayer.set("disabled", item.type != 'style');
            });

            this.btnDlgAddLayer.on("click", function() {
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
        },

        _getValueAttr: function () {
            var widget = this;

            // Простого способа сделать дамп данных из itemStore
            // почему-то нет, поэтому обходим рекурсивно.
            function traverseItem(itm) {
                return {
                    item_type: widget.itemStore.getValue(itm, "item_type"),
                    display_name: widget.itemStore.getValue(itm, "display_name"),
                    group_expanded: widget.itemStore.getValue(itm, "group_expanded"),
                    layer_style_id: widget.itemStore.getValue(itm, "layer_style_id"),
                    layer_enabled: widget.itemStore.getValue(itm, "layer_enabled"),
                    layer_min_scale: widget.itemStore.getValue(itm, "layer_min_scale"),
                    layer_max_scale: widget.itemStore.getValue(itm, "layer_max_scale"),
                    children: array.map(widget.itemStore.getValues(itm, "children"), function (i) { return traverseItem(i) })
                }
            }

            return {
                display_name: this.wDisplayName.get("value"),
                root_item: traverseItem(this.itemModel.root),
                bookmark_layer_id: this.wBookmarkLayer.get("value") != "" ? this.wBookmarkLayer.get("value") : null,
                extent: array.map(['Left', 'Bottom', 'Right', 'Top'], function (e) {
                    return this['wExtent' + e].get('value')
                }, this)
            };
        },

        getAddParent: function () {
            if (this.getItemValue("item_type") == "group") {
                return this.widgetTree.selectedItem;
            } else {
                return this.itemModel.root;
            }
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


    })
})