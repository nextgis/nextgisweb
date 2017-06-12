define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/layout/BorderContainer",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/Dialog",
    "dijit/form/Select",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer",
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/extensions/DijitRegistry",
    "ngw/route",
    "ngw-auth/PrincipalSelect",
    "ngw-resource/serialize",
    // resource
    "ngw/load-json!auth/principal/dump",
    "ngw/load-json!resource/schema",
    "ngw-pyramid/i18n!resource",
    // css
    "xstyle/css!./resource/PermissionWidget.css",
    "ngw/dgrid/css"
], function (
    declare,
    lang,
    array,
    Memory,
    Observable,
    domConstruct,
    domClass,
    domStyle,
    BorderContainer,
    Toolbar,
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
    serialize,
    principalDump,
    resourceSchema,
    i18n
) {
    var _COUNTER = 0;

    var S_ALL_RESOURCES = i18n.gettext("All resources");
    var S_ALL_PERMISSIONS = i18n.gettext("All permissions");

    var GridClass = declare([Grid, Selection, DijitRegistry], {
        selectionMode: "single",
        style: "border: none",

        columns: {
            action: {
                label: i18n.gettext("Action"),
                get: function (itm) {
                    return {
                        allow: i18n.gettext("Allow"),
                        deny: i18n.gettext("Deny")
                    }[itm.action];
                }
            },

            principal: {
                label: i18n.gettext("Principal"),
                get: function (itm) {
                    return this.grid.principalStore.get(itm.principal.id).display_name;
                }},
            
            permission: {
                label: i18n.gettext("Permission"),
                get: function (itm) {
                    if (itm.scope === "" && itm.permission === "") {
                        return S_ALL_RESOURCES + ": " + S_ALL_PERMISSIONS;
                    } else if (itm.permission === "") {
                        return resourceSchema.scopes[itm.scope].label + ": " + S_ALL_PERMISSIONS;
                    } else {
                        return resourceSchema.scopes[itm.scope].label + ": " + resourceSchema.scopes[itm.scope].permissions[itm.permission].label;
                    }
                }},
            
            identity: {
                label: i18n.gettext("Resource"),
                get: function (itm) {
                    if (itm.identity === "") {
                        return S_ALL_RESOURCES;
                    } else {
                        return resourceSchema.resources[itm.identity].label;
                    }
                }},
            
            propagate: {
                label: i18n.gettext("Propagate"),
                get: function (itm) {
                    if (itm.propagate) {
                        return i18n.gettext("Yes");
                    } else {
                        return i18n.gettext("No");
                    }
                }},
        },

        constructor: function () {
            this.principalStore = new Memory({data: principalDump});
        }
    });

    var DialogClass = declare([Dialog], {
        title: i18n.gettext("Permission item"),
        style: "width: 600px",

        buildRendering: function () {
            this.inherited(arguments);

            this.container = new TableContainer({
                cols: 1,
                labelWidth: "150",
                customClass: "dijitDialogPaneContentArea",
            }).placeAt(this);

            this.action = new Select({
                label: i18n.gettext("Action"),
                style: "width: 100%",
                options: [
                    {value: "allow", label: i18n.gettext("Allow")},
                    {value: "deny", label: i18n.gettext("Deny")}
                ]
            }).placeAt(this.container);

            this.principal = new PrincipalSelect({
                label: i18n.gettext("Principal"),
                style: "width: 100%",
                required: true
            }).placeAt(this.container);

            var permissionOpts = [{value: ":", label: S_ALL_RESOURCES + ": " + S_ALL_PERMISSIONS}];
            var identityOpts = [{value: "", label: S_ALL_RESOURCES}];

            for (var ks in resourceSchema.scopes) {
                var scope = resourceSchema.scopes[ks];
                
                permissionOpts.push({type: "separator"});
                permissionOpts.push({
                    value: ks + ":",
                    label: scope.label + ": " + S_ALL_PERMISSIONS
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
                label: i18n.gettext("Permission"),
                style: "width: 100%",
                options: permissionOpts
            }).placeAt(this.container);

            this.identity = new Select({
                label: i18n.gettext("Resource"),
                style: "width: 100%",
                options: identityOpts
            }).placeAt(this.container);

            this.propagate = new CheckBox({
                label: i18n.gettext("Propagate")
            }).placeAt(this.container);

            this.actionBar = domConstruct.create("div", {
                class: "dijitDialogPaneActionBar"
            }, this.containerNode);

            new Button({
                label: i18n.gettext("OK"),
                onClick: lang.hitch(this, function () {
                    if (this.validate() && this._callback(this.get("value"))) {
                        this.hide();
                    }
                })
            }).placeAt(this.actionBar);
            
            new Button({
                label: i18n.gettext("Cancel"),
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
                principal: { id: this.principal.get("value") },
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
            this.principal.set("value", value.principal.id);
            this.permission.set("value", value.scope + ":" + value.permission);
            this.identity.set("value", value.identity);
            this.propagate.set("checked", value.propagate);
        }
    });

    return declare([BorderContainer, serialize.Mixin], {
        title: i18n.gettext("Permissions"),

        style: "padding: 0px;",
        gutters: false,

        _principalSort: function (sort) {
            this.grid.set("sort", lang.hitch(this, function(a, b) {
                var aname = this.grid.principalStore.get(a.principal.id).display_name;
                var bname = this.grid.principalStore.get(b.principal.id).display_name;
                if (aname > bname) return sort.descending ? -1 : 1;
                else if (aname < bname) return sort.descending ? 1 : -1;
                else return 0;
            }));
        },

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

                this.btnEdit.set("disabled", false);
                this.btnDelete.set("disabled", false);
            }));

            this.grid.on("dgrid-sort", lang.hitch(this, function(event) {
                var sort = event.sort[0];
                if (sort.attribute == "principal") {
                    event.preventDefault();
                    this._principalSort(sort);
                    this.grid.updateSortArrow(event.sort, true);
                }
            }));

            this.grid.on(".dgrid-row:dblclick", lang.hitch(this, this.itemEdit));
        },

        postCreate: function () {
            this.inherited(arguments);
            this.serattrmap.push({key: "resource.permissions", widget: this});
            this._principalSort({attribute: "principal"});
        },

        buildRendering: function () {
            this.inherited(arguments);

            domClass.add(this.domNode, "ngw-resource-permission-widget");

            domStyle.set(this.grid.domNode, "border", "none");
            domClass.add(this.grid.domNode, "dgrid-border-fix");
            domConstruct.place(this.grid.domNode, this.domNode);
            
            this.btnAdd = new Button({
                label: i18n.gettext("Add"),
                iconClass: "dijitIconNewTask",
                onClick: lang.hitch(this, this.itemAdd)
            }).placeAt(this.toolbar);

            this.btnEdit = new Button({
                label: i18n.gettext("Edit"),
                iconClass: "dijitIconEdit",
                disabled: true,
                onClick: lang.hitch(this, this.itemEdit)
            }).placeAt(this.toolbar);

            this.btnDelete = new Button({
                label: i18n.gettext("Delete"),
                iconClass: "dijitIconDelete",
                disabled: true,
                onClick: lang.hitch(this, this.itemRemove)
            }).placeAt(this.toolbar);

            this.toolbar.placeAt(this);
        },

        startup: function () {
            this.inherited(arguments);
            this.grid.startup();
        },

        _setValueAttr: function (value) {
            array.forEach(value, function (i) {
                var c = lang.clone(i);
                c.id = (++_COUNTER);
                this.store.put(c);
            }, this);
        },

        _getValueAttr: function () {
            return this.store.query().map(function (i) {
                var c = lang.clone(i);
                c.id = undefined;
                return c;
            });
        },

        itemAdd: function () {
            this.dialog.show(lang.hitch(this, function (data) {
                data.id = (++_COUNTER);
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
