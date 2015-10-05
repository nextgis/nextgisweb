/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dijit/layout/ContentPane",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/data/ItemFileWriteStore",
    "dijit/tree/TreeStoreModel",
    "dijit/Tree",
    "dijit/tree/dndSource",
    "dijit/registry",
    "ngw-resource/serialize",
    "ngw-resource/ResourceStore",
    "ngw-resource/ResourcePicker",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./template/ItemWidget.hbs",
    "ngw/settings!webmap",
    // template
    "dijit/layout/TabContainer",
    "dojox/layout/TableContainer",
    "dijit/layout/BorderContainer",
    "dijit/layout/StackContainer",
    "dijit/layout/ContentPane",
    "dijit/Dialog",
    "dijit/Toolbar",
    "ngw-pyramid/form/DisplayNameTextBox",
    "ngw-pyramid/form/ScaleTextBox",
    "dijit/form/TextBox",
    "dijit/form/CheckBox",
    "dijit/form/NumberTextBox",
    "dijit/form/Select",
    "ngw-resource/Tree"
], function (
    declare,
    array,
    lang,
    domStyle,
    ContentPane,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ItemFileWriteStore,
    TreeStoreModel,
    Tree,
    dndSource,
    registry,
    serialize,
    ResourceStore,
    ResourcePicker,
    i18n,
    hbsI18n,
    template,
    settings
) {
    return declare([ContentPane, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("Layers"),
        templateString: hbsI18n(template, i18n),

        constructor: function () {
            this.itemStore = new ItemFileWriteStore({data: {
                items: [{item_type: "root"}]
            }});

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
                    return item.item_type == "group" ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "dijitLeaf";
                },
                persist: false,
                dndController: dndSource,
                checkItemAcceptance: function (node, source, position) {
                    var item = registry.getEnclosingWidget(node).item,
                        item_type = widget.itemStore.getValue(item, "item_type");
                    // Блокируем возможность перетащить элемент внутрь слоя,
                    // перенос внутрь допустим только для группы
                    return item_type === "group" || (item_type === "layer" && position !== "over");
                },
                betweenThreshold: 5
            });
        },

        postCreate: function () {
            this.inherited(arguments);

            array.forEach(Object.keys(settings.adapters), function (key) {
                this.wLayerAdapter.addOption({
                    value: key,
                    label: i18n.gettext(settings.adapters[key].display_name)
                });
            }, this);

            // Создать дерево без model не получается, поэтому создаем его вручную
            this.widgetTree.placeAt(this.containerTree).startup();

            var widget = this;

            // Добавление новой группы
            this.btnAddGroup.on("click", function () {
                widget.itemStore.newItem(
                    {
                        display_name: i18n.gettext("Add group"),
                        item_type: "group",
                        group_expanded: null
                    }, {
                        parent: widget.getAddParent(),
                        attribute: "children"
                    }
                );
            });

            // Добавление нового слоя
            this.btnAddLayer.on("click", lang.hitch(this, function () {
                this.layerPicker.pick().then(lang.hitch(this, function (itm) {
                    this.itemStore.newItem({
                            "item_type": "layer",
                            "display_name": itm.display_name,
                            "layer_style_id": itm.id,
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
                }));
            }));

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
                    if (newValue.item_type == "group") {
                        widget.widgetItemDisplayNameGroup.set("value", widget.getItemValue("display_name"));
                        widget.widgetProperties.selectChild(widget.paneGroup);
                        widget.widgetItemGroupExpanded.set("checked", widget.getItemValue("group_expanded"));
                    } else if (newValue.item_type == "layer") {
                        widget.widgetItemDisplayNameLayer.set("value", widget.getItemValue("display_name"));
                        widget.widgetProperties.selectChild(widget.paneLayer);
                        widget.wdgtItemLayerEnabled.set("checked", widget.getItemValue("layer_enabled"));
                        widget.wLayerTransparency.set("value", widget.getItemValue("layer_transparency"));
                        widget.wLayerMinScale.set("value", widget.getItemValue("layer_min_scale_denom"));
                        widget.wLayerMaxScale.set("value", widget.getItemValue("layer_max_scale_denom"));
                        widget.wLayerAdapter.set("value", widget.getItemValue("layer_adapter"));
                    }

                    // Изначально боковая панель со свойствами текущего элемента
                    // спрятана. Поскольку элемент уже выбран - ее нужно показать.
                    if (!oldValue) {
                        domStyle.set(widget.itemPane.domNode, "display", "block");
                        widget.treeLayoutContainer.addChild(widget.itemPane);
                    }

                    // Активируем кнопку удаления слоя или группы
                    widget.btnDeleteItem.set("disabled", false);
                }
            });

            // При изменении значений переносим их в модель
            this.widgetItemDisplayNameGroup.watch("value", function (attr, oldValue, newValue) {
                widget.setItemValue("display_name", newValue);
            });

            this.widgetItemDisplayNameLayer.watch("value", function (attr, oldValue, newValue) {
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
            });
        },

        startup: function () {
            this.inherited(arguments);
        },

        validateWidget: function () {
            var result = { isValid: true, error: [] };

            array.forEach([], function (subw) {
                // форсируем показ значка при проверке
                subw._hasBeenBlurred = true;
                subw.validate();

                // если есть ошибки, фиксируем их
                if ( !subw.isValid() ) {
                    result.isValid = false;
                }
            });

            return result;
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
            }
        },

        serializeInMixin: function (data) {
            if (data.webmap === undefined) { data.webmap = {}; }
            var store = this.itemStore;

            // Простого способа сделать дамп данных из itemStore
            // почему-то нет, поэтому обходим рекурсивно.
            function traverse(itm) {
                return {
                    item_type: store.getValue(itm, "item_type"),
                    display_name: store.getValue(itm, "display_name"),
                    group_expanded: store.getValue(itm, "group_expanded"),
                    layer_style_id: store.getValue(itm, "layer_style_id"),
                    layer_enabled: store.getValue(itm, "layer_enabled"),
                    layer_transparency: store.getValue(itm, "layer_transparency"),
                    layer_min_scale_denom: store.getValue(itm, "layer_min_scale_denom"),
                    layer_max_scale_denom: store.getValue(itm, "layer_max_scale_denom"),
                    layer_adapter: store.getValue(itm, "layer_adapter"),
                    children: array.map(store.getValues(itm, "children"), function (i) { return traverse(i); })
                };
            }

            data.webmap.root_item = traverse(this.itemModel.root);
        },

        deserializeInMixin: function (data) {
            var value = data.webmap.root_item;
            if (value === undefined) { return; }

            var widget = this;

            function traverse(item, parent) {
                array.forEach(item.children, function(i) {
                    var element = {};
                    for (var key in i) {
                        if (key !== "children") { element[key] = i[key]; }
                    }
                    var new_item = widget.itemStore.newItem(element, {parent: parent, attribute: "children"});
                    if (i.children) { traverse(i, new_item); }
                }, widget);
            }
            traverse(value, this.itemModel.root);
        }
    });
});
