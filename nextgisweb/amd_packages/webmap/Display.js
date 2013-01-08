define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Display.html",
    "dojo/_base/array",
    "dojox/geo/openlayers/Map",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/layout/ContentPane",
    // дерево слоев
    "dojo/data/ItemFileWriteStore",
    "cbtree/models/TreeStoreModel",
    "cbtree/Tree",
    "dijit/tree/dndSource",
    // template
    "dijit/layout/TabContainer",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/Select",
    "dijit/form/DropDownButton",
    "dijit/tree/dndSource"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    array,
    Map,
    DropDownButton,
    DropDownMenu,
    MenuItem,
    ContentPane,
    ItemFileWriteStore,
    TreeStoreModel,
    Tree,
    dndSource
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function (options) {
            this.treeConfig = options.treeConfig;
            this.layerConfig = options.layerConfig;

            // Хранилище значений для дерева слоев
            this._treeStore = new ItemFileWriteStore({
                data: { 
                    label: "display_name",
                    items: [ options.treeConfig ]
                }
            }); 

            // Модель данных для дерева слоев
            this._treeModel = new TreeStoreModel({
                store: this._treeStore,
                query: {item_type: 'root'},
                checkedAll: false
            });

            // Из за необходимости модели дерево не получается создать
            // в декларативном стиле, создаем вручную
            this.treeWidget = new Tree({
                model: this._treeModel,
                autoExpand: true,
                showRoot: false,
                branchReadOnly: true,
                dndController: dndSource
            });

            this._layers = {};

            var display = this;
            this.treeWidget.on("checkBoxClick", function (item, nodeWidget, evt) {
                display._layers[item.id].olLayer.setVisibility(nodeWidget.get("checked"));
            });

            array.forEach(this.layerConfig, function (l) {
                display._layers[l.id] = new options.adapterClasses.tms(l);
            });

            // Класс реализующий динамическое модменю "Слой"
            var LayerDropDown = declare([DropDownButton], {
                label: "Слой",
                mapDisplay: this,

                // Метод динамически формирующий меню, потом
                // его нужно будет заменить чем-то содержательным.
                loadDropDown: function (callback) {
                    var mapDisplay = this.mapDisplay;
                    var menu = new DropDownMenu({ style: "display: none;"});

                    menu.addChild(MenuItem({
                        label: "Описание",
                        onClick: function () {
                            mapDisplay.tabContainer.addChild(ContentPane({
                                title: "Описание слоя",
                                closable: false
                            }));
                        }
                    }));

                    menu.addChild(MenuItem({
                        label: "Объекты",
                        onClick: function () {
                            mapDisplay.tabContainer.addChild(ContentPane({
                                title: "Объекты слоя",
                                closable: true
                            }));
                        }
                    }));

                    this.dropDown = menu;
                    callback();
                }
            });
            this.layerDropDown = new LayerDropDown({});

        },

        startup: function () {
            this.inherited(arguments);

            // Размещаем дерево на теле виджета
            this.treeWidget.placeAt(this.layerTreePane);

            // Инициализируем карту, без DOM она похоже не умеет
            var dojoMap = new Map(this.mapNode);

            // Добавляем OL-слои на веб-карту
            var display = this;
            array.forEach(layerConfig, function(l) {
                dojoMap.olMap.addLayer(display._layers[l.id].olLayer);
            });

            // Добавляем меню "Слой" в начало тулбара
            this.mapToolbar.addChild(this.layerDropDown, 0);

        }
    });
});
