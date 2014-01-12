define([
    "dojo/_base/declare",
    "dojo/dom-style",
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
    "dijit/registry",
    "ngw/settings!webmap",
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
    "dijit/form/Select",
    "dijit/_WidgetBase",
    "layer/LayerTree"
], function (
    declare,
    domStyle,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    ItemFileWriteStore,
    TreeStoreModel,
    Tree,
    dndSource,
    registry,
    settings
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

            var widget = this;

            this.widgetTree = new Tree({
                model: this.itemModel,
                showRoot: false,
                getLabel: function (item) { return item.display_name; },
                getIconClass: function(item, opened){
                    return item.item_type == 'group' ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "dijitLeaf";
                },
                persist: false,
                dndController: dndSource,
                checkItemAcceptance: function (node, source, position) {
                    var item = registry.getEnclosingWidget(node).item,
                        item_type = widget.itemStore.getValue(item, 'item_type');
                    // Блокируем возможность перетащить элемент внутрь слоя,
                    // перенос внутрь допустим только для группы
                    return item_type === 'group' || (item_type === 'layer' && position !== 'over');
                },
                betweenThreshold: 5,
            });
        },

        postCreate: function () {
            this.inherited(arguments);

            array.forEach(Object.keys(settings.adapters), function (key) {
                this.wLayerAdapter.addOption({
                    value: key,
                    label: settings.adapters[key].display_name
                });
            }, this);

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
                        item_type: "group",
                        group_expanded: null
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
                widget.treeLayoutContainer.removeChild(widget.itemPane);
                widget.btnDeleteItem.set("disabled", true);
            });

            this.widgetTree.watch("selectedItem", function (attr, oldValue, newValue) {
                if (newValue) {
                    // При изменении выделенного элемента перенесем значения в виджеты
                    // и покажем нужную панель: для слоев одну, для групп другую.
                    widget.widgetItemDisplayName.set("value", widget.getItemValue("display_name"));
                    
                    if (newValue.item_type == "group") {
                        widget.widgetProperties.selectChild(widget.paneGroup);
                        widget.widgetItemGroupExpanded.set("checked", widget.getItemValue("group_expanded"));
                    } else if (newValue.item_type == "layer") {
                        widget.widgetProperties.selectChild(widget.paneLayer);
                        widget.wdgtItemLayerEnabled.set("checked", widget.getItemValue("layer_enabled"));
                        widget.wLayerTransparency.set("value", widget.getItemValue("layer_transparency"));
                        widget.wLayerMinScale.set("value", widget.getItemValue("layer_min_scale_denom"));
                        widget.wLayerMaxScale.set("value", widget.getItemValue("layer_max_scale_denom"));
                        widget.wLayerAdapter.set("value", widget.getItemValue("layer_adapter"));
                    };

                    // Изначально боковая панель со свойствами текущего элемента
                    // спрятана. Поскольку элемент уже выбран - ее нужно показать.
                    if (!oldValue) {
                        domStyle.set(widget.itemPane.domNode, 'display', 'block');
                        widget.treeLayoutContainer.addChild(widget.itemPane);
                    };

                    // Активируем кнопку удаления слоя или группы
                    widget.btnDeleteItem.set("disabled", false);
                }
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

            this.wLayerTransparency.watch("value", function (attr, oldVal, newVal) {
                widget.setItemValue("layer_transparency", newVal);
            });

            this.wLayerMinScale.watch("value", function (attr, oldVal, newVal) {
                widget.setItemValue("layer_min_scale_denom", newVal);
            });

            this.wLayerMaxScale.watch("value", function (attr, oldVal, newVal) {
                widget.setItemValue("layer_max_scale_denom", newVal);
            });

            this.wLayerAdapter.watch("value", function (attr, oldVal, newVal) {
                widget.setItemValue("layer_adapter", newVal);
            })

            this.wgtLayer.on("click", function (item) {
                widget.btnDlgAddLayer.set("disabled", item.type != 'style');
            });

            this.btnDlgAddLayer.on("click", function() {
                var item = widget.itemStore.newItem(
                    {
                        "item_type": "layer",
                        "display_name": widget.wgtLayer.selectedItem.layer_display_name,
                        "layer_style_id": widget.wgtLayer.selectedItem.id,
                        "layer_enabled": false,
                        "layer_transparency": null,
                        "layer_min_scale_denom": null,
                        "layer_max_scale_denom": null,
                        "layer_adapter": "image"
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
                    layer_transparency: widget.itemStore.getValue(itm, "layer_transparency"),
                    layer_min_scale_denom: widget.itemStore.getValue(itm, "layer_min_scale_denom"),
                    layer_max_scale_denom: widget.itemStore.getValue(itm, "layer_max_scale_denom"),
                    layer_adapter: widget.itemStore.getValue(itm, "layer_adapter"),
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