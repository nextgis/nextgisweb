/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dijit/layout/BorderContainer",
    "dijit/Toolbar",
    "dijit/ToolbarSeparator",
    "dijit/form/Button",
    "dijit/Dialog",
    "dijit/form/Select",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/extensions/DijitRegistry",
    "ngw/route",
    "ngw/form/PrincipalSelect",
    "ngw/load-json!auth/principal/dump",
    "ngw/load-json!resource/schema",

    "xstyle/css!./resource/AclEditor.css"
], function (
    declare,
    lang,
    array,
    Memory,
    Observable,
    xhr,
    json,
    domConstruct,
    domClass,
    BorderContainer,
    Toolbar,
    ToolbarSeparator,
    Button,
    Dialog,
    Select,
    CheckBox,
    TableContainer,
    Grid,
    Selection,
    DijitRegistry,
    route,
    PrincipalSelect,
    principalDump,
    resourceSchema
) {

    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",

        columns: {
            action: {
                label: "Действие",
                get: function (itm) {
                    return {
                        allow: "Разрешить",
                        deny: "Запретить"
                    }[itm.action];
                }
            },

            principal: {
                label: "Субъект",
                get: function (itm) {
                    return this.grid.principalStore.get(itm.principal_id).display_name;
                }},
            
            permission: {
                label: "Право",
                get: function (itm) {
                    if (itm.scope === "" && itm.permission === "") {
                        return "Все ресурсы: Все права";
                    } else if (itm.permission === "") {
                        return resourceSchema.scopes[itm.scope].label + ": " + "Все права";
                    } else {
                        return resourceSchema.scopes[itm.scope].label + ": " + resourceSchema.scopes[itm.scope].permissions[itm.permission].label;
                    }
                }},
            
            identity: {
                label: "Ресурс",
                get: function (itm) {
                    if (itm.identity === "") {
                        return "Все ресурсы";
                    } else {
                        return resourceSchema.resources[itm.identity].label;
                    }
                }},
            
            propagate: {
                label: "Распр.",
                get: function (itm) {
                    if (itm.propagate) {
                        return "Да";
                    } else {
                        return "Нет";
                    }
                }},
        },

        constructor: function () {
            this.principalStore = new Memory({data: principalDump});
        }
    });

    var DialogClass = declare([Dialog], {
        title: "Элемент правил доступа",
        style: "width: 600px",

        buildRendering: function () {
            this.inherited(arguments);

            this.container = new TableContainer({
                cols: 1,
                labelWidth: "150",
                customClass: "dijitDialogPaneContentArea",
            }).placeAt(this);

            this.action = new Select({
                label: "Действие",
                style: "width: 100%",
                options: [
                    {value: "allow", label: "Разрешить"},
                    {value: "deny", label: "Запретить"}
                ]
            }).placeAt(this.container);

            this.principal = new PrincipalSelect({
                label: "Субъект",
                style: "width: 100%",
            }).placeAt(this.container);

            var permissionOpts = [{value: ":", label: "Все ресурсы: Все права"}];
            var identityOpts = [{value: "", label: "Все ресурсы"}];

            for (var ks in resourceSchema.scopes) {
                var scope = resourceSchema.scopes[ks];
                
                permissionOpts.push({type: "separator"});
                permissionOpts.push({
                    value: ks + ":",
                    label: scope.label + ": " + "Все права"
                });
                
                for (var kp in scope.permissions) {
                    var permission = scope.permissions[kp];
                    permissionOpts.push({
                        value: ks + ":" + kp,
                        label: scope.label + ": " + permission.label
                    });
                }
            }

            for (var kr in resourceSchema.resources) {
                var resource = resourceSchema.resources[kr];
                identityOpts.push({
                    value: kr,
                    label: resource.label
                });
            }

            this.permission = new Select({
                label: "Право",
                style: "width: 100%",
                options: permissionOpts
            }).placeAt(this.container);

            this.identity = new Select({
                label: "Ресурс",
                style: "width: 100%",
                options: identityOpts
            }).placeAt(this.container);

            this.propagate = new CheckBox({
                label: "Распространять"
            }).placeAt(this.container);

            this.actionBar = domConstruct.create("div", {
                class: "dijitDialogPaneActionBar"
            }, this.containerNode);

            new Button({
                label: "OK",
                onClick: lang.hitch(this, function () {
                    if (this._callback(this.get("value"))) {
                        this.hide();
                    }
                })
            }).placeAt(this.actionBar);
            
            new Button({
                label: "Отмена",
                onClick: lang.hitch(this, this.hide)
            }).placeAt(this.actionBar);
        },

        show: function (callback) {
            this.inherited(arguments);
            this._callback = callback;
        },

        _getValueAttr: function () {
            return {
                id: this._id,
                action: this.action.get("value"),
                principal_id: this.principal.get("value"),
                scope: this.permission.get("value").split(":")[0],
                permission: this.permission.get("value").split(":")[1],
                identity: this.identity.get("value"),
                propagate: this.propagate.get("checked")
            };
        },

        _setValueAttr: function (value) {
            this._set("value", value);
            this._id = value.id;
            this.action.set("value", value.action);
            this.principal.set("value", value.principal_id);
            this.permission.set("value", value.scope + ":" + value.permission);
            this.identity.set("value", value.identity);
            this.propagate.set("checked", value.propagate);
        }
    });

    return declare("ngw.resource.AclEditor", BorderContainer, {

        constructor: function (kwArgs) {
            declare.safeMixin(this, kwArgs);

            this.store = new Observable(new Memory({}));

            this.toolbar = new Toolbar({region: "top"});

            this.dialog = new DialogClass();

            this.grid = new GridClass({
                store: this.store,
                region: "center"
            });

            this.grid.on("dgrid-select", lang.hitch(this, function () {
                for (var k in this.grid.selection) {
                    if (this.grid.selection[k]) {
                        this.dialog.set("value", this.store.get(k));
                    }
                }
            }));

            this.grid.on(".dgrid-row:dblclick", lang.hitch(this, this.itemEdit));

            this._counter = 0; // счетчик для id в store

            xhr(route("resource.security", {id: this.resourceId}), {
                handleAs: "json",
                headers: { "Accept": "application/json" }
            }).then(lang.hitch(this, function (data) {
                array.forEach(data, function (itm) {
                    itm.id = (++this._counter);
                    this.store.put(itm);
                }, this);
            })).otherwise(console.error);
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngwResourceAclEditor");
            
            domConstruct.place(this.grid.domNode, this.domNode);
            
            new Button({
                label: "Сохранить",
                iconClass: "dijitIconSave",
                onClick: lang.hitch(this, this.save)
            }).placeAt(this.toolbar);

            new ToolbarSeparator().placeAt(this.toolbar);

            new Button({
                label: "Добавить",
                iconClass: "dijitIconNewTask",
                onClick: lang.hitch(this, this.itemAdd)
            }).placeAt(this.toolbar);

            new Button({
                label: "Изменить",
                iconClass: "dijitIconEdit",
                onClick: lang.hitch(this, this.itemEdit)
            }).placeAt(this.toolbar);

            new Button({
                label: "Удалить",
                iconClass: "dijitIconDelete",
                onClick: lang.hitch(this, this.itemRemove)
            }).placeAt(this.toolbar);

            this.toolbar.placeAt(this);
        },

        startup: function () {
            this.inherited(arguments);
            this.grid.startup();
        },

        save: function () {
            var data = this.store.query();
            xhr.put(route("resource.security", {id: this.resourceId}), {
                data: json.stringify(data),
                handleAs: "json",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });
        },

        itemAdd: function () {
            this.dialog.show(lang.hitch(this, function (data) {
                data.id = ++this._counter;
                this.store.put(data);
                this.grid.clearSelection();
                this.grid.select(data.id);
                return true;
            }));
        },

        itemEdit: function () {
            this.dialog.show(lang.hitch(this, function (data) {
                this.store.put(data);
                this.grid.clearSelection();
                this.grid.select(data.id);
                return true;
            }));
        },

        itemRemove: function () {
            for (var k in this.grid.selection) {
                if (this.grid.selection[k]) {
                    this.store.remove(k);
                }
            }
        }
    });
});