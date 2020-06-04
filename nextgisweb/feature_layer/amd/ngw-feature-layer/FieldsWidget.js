define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dojo/dom-construct",
    "dojo/dom-style",   
    "dojo/dom-class",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dijit/Toolbar",
    "dijit/Tooltip",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/DropDownButton",
    "dijit/form/ValidationTextBox",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/editor",
    "dgrid/extensions/DijitRegistry",
    "ngw/settings!feature_layer",
    "ngw-pyramid/form/KeynameTextBox",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!feature_layer",
    //
    "xstyle/css!./resource/FieldsWidget.css",
    "ngw/dgrid/css"
], function (
    declare,
    lang,
    array,
    Memory,
    Observable,
    domConstruct,
    domStyle,
    domClass,
    DropDownMenu,
    MenuItem,
    Toolbar,
    Tooltip,
    ContentPane,
    Button,
    CheckBox,
    DropDownButton,
    ValidationTextBox,
    Grid,
    Selection,
    editor,
    DijitRegistry,
    settings,
    KeynameTextBox,
    serialize,
    i18n
) {
    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",

        renderRow: function(_item) {
            var row = this.inherited(arguments);
            if (_item.deleted) {
                domClass.add(row, "deleted");
            }
            return row;
        },

        columns: [
            { field: "idx", label: "#", sortable: false },

            editor({
                field: "keyname",
                label: i18n.gettext("Keyname"),
                sortable: false,
                autoSave: true,
                editor: KeynameTextBox,
                editorArgs: {
                    required: true,
                    style: "width: 100%; border: none"
                }
            }),

            { field: "datatype", label: i18n.gettext("Type"), sortable: false },

            editor({
                field: "display_name",
                label: i18n.gettext("Display name"),
                sortable: false,
                autoSave: true,
                editor: ValidationTextBox,
                editorArgs: {
                    value: "value",
                    required: true,
                    style: "width: 100%; border: none;"
                }
            }),

            editor({
                field: "grid_visibility",
                id: "grid_visibility",
                label: i18n.gettext("FT"),
                sortable: false,
                autoSave: true,
                editor: CheckBox,
                editorArgs: { value: true }
            }),

            editor({
                field: "label_field",
                id: "label_field",
                label: i18n.gettext("LA"),
                sortable: false,
                autoSave: true, 
                editor: CheckBox,
                editorArgs: { value: true }
            })

        ]
    });


    return declare([ContentPane, serialize.Mixin], {
        title: i18n.gettext("Attributes"),
        prefix: "feature_layer",
        style: "padding: 0",

        constructor: function () {
            this.store = new Observable(new Memory({idProperty: "idx"}));
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-feature-layer-fields-widget");
            domClass.add(this.domNode, "dgrid-border-fix");

            this.grid = new GridClass({ store: this.store });
            this.grid.region = "center";

            this.grid.on("dgrid-datachange", function(evt){
                if (evt.cell.column.field === "label_field" && evt.value === true) {
                    this.store.query({label_field: true}).forEach(function (obj) {
                        obj.label_field = false;
                        this.store.put(obj);
                    }.bind(this));
                }
            }.bind(this));
            domStyle.set(this.grid.domNode, "border", "none");

            new Tooltip({
                connectId: [this.grid.column("label_field").headerNode],
                label: i18n.gettext("Label attribute")
            });

            new Tooltip({
                connectId: [this.grid.column("grid_visibility").headerNode],
                label: i18n.gettext("Feature table")
            });

            this.toolbar = new Toolbar({});

            this.addMenu = new DropDownMenu({style: "display: none;"});

            if (this.composite.cls === 'vector_layer') {
                var store = this.store;
                var grid = this.grid;

                function add () {
                    store.add({
                        datatype: this.value,
                        // FIXME: set default
                        grid_visibility: true,
                        display_name: "value",
                        idx: store.data.length + 1
                    });
                }

                function remove () {
                    for (var index in grid.selection) {
                        var item = store.get(index);
                        item.deleted = !item.deleted;
                        store.put(item);
                    }
                };

                function sort (direction) {
                    var selectFrom, selectTo;
                    for (var index in grid.selection) {
                        if (selectFrom === undefined) {
                            selectFrom = Number.parseInt(index);
                        }
                        selectTo = Number.parseInt(index);
                    }

                    var indexFrom = direction === 1 ? selectFrom - 1 : selectTo + 1;
                    var indexTo = direction === 1 ? selectTo : selectFrom;

                    var jumpItem;
                    store.query({ idx: indexFrom }).forEach(function (item) {
                        jumpItem = item;
                    });

                    if (jumpItem) {
                        store.query(function (object) {
                            return object.idx >= selectFrom && object.idx <= selectTo;
                        }).forEach(function (item) {
                            item.idx -= direction;
                            store.put(item);
                        });
                        jumpItem.idx = indexTo;
                        store.put(jumpItem);
                        // FIXME: grid.set('sort', [{ attribute: 'idx', descending: false }]) not working
                        grid.sort('idx');
                        grid.select(selectFrom - direction, selectTo - direction);
                        
                    }
                }

                settings.datatypes.forEach(function(datatype) {
                    this.addMenu.addChild(new MenuItem({
                        label: datatype,
                        value: datatype,
                        showLabel: true,
                        onClick: add
                    }));
                }.bind(this));

                this.toolbar.addChild(new DropDownButton({
                    label: i18n.gettext("Add"),
                    iconClass: "dijitIconNewTask",
                    dropDown: this.addMenu
                }));

                this.toolbar.addChild(new Button({
                    label: i18n.gettext("Remove"),
                    iconClass: "dijitIconDelete",
                    onClick: remove
                }));

                this.toolbar.addChild(new Button({
                    label: '\u21E7',
                    onClick: sort.bind(this, 1)
                }));

                this.toolbar.addChild(new Button({
                    label: '\u21E9',
                    onClick: sort.bind(this, -1)
                }));

                this.toolbar.region = "top";

                this.addChild(this.toolbar);
            }
            // TODO: fix scroll and ".region"
            this.addChild(this.grid);
        },

        deserializeInMixin: function (data) {
            var value = data[this.prefix].fields,
                store = this.store,
                idx = 1;

            array.forEach(value, function (_item) {
                var item = lang.clone(_item);
                item.idx = idx++;
                item.deleted = false;
                store.put(item);
            });
        },

        serializeInMixin: function (data) {
            var prefix = this.prefix,
                setObject = function (key, value) { lang.setObject(prefix + "." + key, value, data); };

            // TODO: We rely on MemoryStore.query being synchronous,
            // this might be not wise
            setObject("fields", this.store.query().map(function (src) {
                var obj = lang.clone(src);
                obj.idx = undefined;
                return obj;
            }));
        }

    });
});
