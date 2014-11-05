/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/when",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dijit/layout/LayoutContainer",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/form/TextBox",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/editor",
    "dgrid/extensions/DijitRegistry",    
    "ngw-resource/serialize",
    //
    "xstyle/css!./resource/Widget.css",
    "ngw/dgrid/css"
], function (
    declare,
    lang,
    array,
    Deferred,
    when,
    domStyle,
    domClass,
    Memory,
    Observable,
    LayoutContainer,
    Toolbar,
    Button,
    DropDownButton,
    DropDownMenu,
    MenuItem,
    TextBox,
    Grid,
    Selection,
    editor,
    DijitRegistry,
    serialize
) {
    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",

        columns: [
            editor({
                field: "key",
                label: "Ключ",
                sortable: false,
                autoSave: true,
                editor: TextBox,
                editorArgs: {style: "width: 100%; border: none;"}
            }),

            {
                field: "type",
                label: "Тип",
                sortable: false,
                formatter: function (v) { return v[0].toUpperCase() + v.slice(1) }
            },

            editor({
                field: "value",
                label: "Значение",
                sortable: false,
                autoSave: true,
                editor: TextBox,
                editorArgs: {style: "width: 100%; border: none;"}
            })

        ]
    });

    var typeOfValue = function (v) {
        if (typeof v === "string") {
            return "text";
        } else if ((typeof v === "number") && (v === parseInt(v, 10))) {
            return "integer";
        } else if (typeof v === "number") {
            return "float";
        };
    };

    return declare("ngw.resmeta.Widget", [LayoutContainer, serialize.Mixin], {
        prefix: "resmeta",
        title: "Метаданные",

        constructor: function () {
            this.store = new Observable(new Memory({idProperty: "id"}));           
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-resmeta-widget");

            this.grid = new GridClass({store: this.store});
            this.grid.region = "center";
            
            domClass.add(this.grid.domNode, "dgrid-border-fix");
            domStyle.set(this.grid.domNode, "border", "none");
            this.addChild(this.grid);

            this.toolbar = new Toolbar({});

            this.addMenu = new DropDownMenu({style: "display: none;"});

            var store = this.store, add = function () {
                store.add({key: "", type: this.value, value: ""})
            };
 
            this.addMenu.addChild(new MenuItem({
                label: "Text",
                value: "text",
                showLabel: true,
                onClick: add
            }));

            this.addMenu.addChild(new MenuItem({
                label: "Integer",
                value: "integer",
                showLabel: true,
                onClick: add
            }));

            this.addMenu.addChild(new MenuItem({
                label: "Float",
                value: "float",
                showLabel: true,
                onClick: add
            }));

            this.toolbar.addChild(new DropDownButton({
                label: "Добавить",
                iconClass: "dijitIconNewTask",
                dropDown: this.addMenu
            }));

            this.toolbar.addChild(new Button({
                label: "Удалить",
                iconClass: "dijitIconDelete",
                onClick: lang.hitch(this, function () {
                    for (var key in this.grid.selection) {
                        this.store.remove(key);
                    }
                })
            }));                

            this.toolbar.region = "top";
            this.addChild(this.toolbar);
        },

        deserializeInMixin: function (data) {
            var items = data[this.prefix].items,
                store = this.store;

            for (var key in items) {
                var value = items[key];
                store.add({key: key, type: typeOfValue(value), value: value.toString()});
            }
        },       

        serializeInMixin: function (data) {
            if (data.resmeta === undefined) { data.resmeta = {}; }
            data.resmeta.items = {};

            var items = data.resmeta.items;

            this.store.query().forEach(function (f) {
                var value = undefined;

                if (f.type == "text") {
                    value = f.value
                } else if (f.type == "integer") {
                    value = parseInt(f.value, 10);
                    if (isNaN(value)) { value = 0 }
                } else if (f.type == "float") {
                    value = parseFloat(f.value);
                    if (isNaN(value)) { value = 0.0 }
                }

                // Пустые ключи не записываем, хотя почему
                if (f.key != "") { items[f.key] = value }
            });

        }
    });
});