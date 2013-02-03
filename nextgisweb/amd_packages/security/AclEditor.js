define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/data/ItemFileWriteStore",
    "dojo/on",
    "dojo/mouse",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/BorderContainer",
    "dijit/popup",
    "dijit/Tooltip",
    "dijit/form/Button",
    "dojox/grid/DataGrid",
    "dojox/grid/cells",
    "ngw/form/PrincipalSelect",
    // data
    "ngw/load-json!security/schema",
    // template
    "dojo/text!./templates/AclEditor.html",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/DropDownButton",
    "dijit/TooltipDialog",
    "dojox/grid/DataGrid",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + 'dojox/grid/resources/claroGrid.css'
], function (
    declare,
    lang,
    array,
    Deferred,
    xhr,
    json,
    ItemFileWriteStore,
    on,
    mouse,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    BorderContainer,
    popup,
    Tooltip,
    Button,
    DataGrid,
    cells,
    PrincipalSelect,
    securitySchema,
    template
) {
    var _logError = function (error) {
        console.error(error);
    };

    var _userGridStructure = [
        { field: "principal_id", name: "#", width: "24px" },
        { field: "principal_cls", name: "Т", width: "24px" },
        { field: "principal_display_name", name: "Субъект", width: "100%" }
    ];

    var ItemStore = declare(ItemFileWriteStore, {
        
        preamble: function (options) {
            options.data = { items: [] };
        },

        constructor: function (options) {
            this.resource = options.resource;

            this.on("New", this._updateFlags);
            this.on("Set", this._fixFlags);
            this.on("Set", this._updateOperation);
        },

        _updateFlags: function (item) {
            var operation = this.getValue(item, 'operation')
            if (operation == undefined) { return };

            var comps = operation.split('-');

            this.setValue(item, 'allow', comps[0] == 'allow');
            this.setValue(item, 'deny', comps[0] == 'deny');
            this.setValue(item, 'node', comps[1] == 'node');
        },

        _updateOperation: function (item) {
            var allow = this.getValue(item, 'allow'),
                deny = this.getValue(item, 'deny'),
                node = this.getValue(item, 'node'),
                comps = [],
                operation = this.getValue(item, 'operation');

            comps.push(allow ? 'allow' : (deny ? 'deny' : 'inherit'));
            comps.push(node ? 'node' : 'subtree');

            var newVal = comps.join('-');
            if (operation != newVal) {
                this.setValue(item, 'operation', newVal);
            };
        },

        _fixFlags: function (item, attr) {
            var allow = this.getValue(item, 'allow'),
                deny = this.getValue(item, 'deny');

            if (allow && deny) {
                this.setValue(item, {allow: 'deny', deny: 'allow'}[attr], false);
            }
        },

        complementPrincipal: function (principal_id) {
            var store = this;

            var resources = lang.clone(securitySchema[this.resource].children);
            if (resources.indexOf(this.resource) < 0) {
                resources.push(this.resource);
            };

            for (var idx in resources) {
                var resource = resources[idx];

                for (var permission in securitySchema[resource].permissions) {
                    var r = resource, p = permission;

                    store.fetch({
                        query: {resource: r, permission: p, principal_id: principal_id},
                        onComplete: function (items) {
                            if (items.length == 0) {
                                var item = store.newItem({
                                    resource: r,
                                    permission: p,
                                    principal_id: principal_id,
                                    allow: false,
                                    deny: false,
                                    node: false
                                });
                                store._updateOperation(item);
                            };
                        }
                    })
                };
            };
        }

    });

    return declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function (options) {
            declare.safeMixin(this, options);

            this.defaultOperation = "inherit-subtree";

            this.itemStore = new ItemStore({resource: this.resource});

            this.principalStore = new ItemFileWriteStore({
                data: { items: [] }
            });

            var widget = this,
                itemStore = this.itemStore, 
                principalStore = this.principalStore,
                loadDeferred = new Deferred();

            // При добавлении новой записи в таблицу разрешений,
            // добавляем запись в таблицу субъектов, если ее там нет
            itemStore.on("New", function (item) {
                principalStore.fetch({
                    query: { principal_id: itemStore.getValue(item, "principal_id") },
                    onComplete: function (items) {
                        if (items.length == 0) {
                            principalStore.newItem({
                                principal_id: itemStore.getValue(item, "principal_id"),
                                principal_cls: itemStore.getValue(item, "principal_cls"),
                                principal_display_name: itemStore.getValue(item, "principal_display_name")
                            });
                        }
                    }
                });
            });

            // После того как загрузка данных будет завершена, добавляем
            // обработчик, который дополняет таблицу разрешений при добавлении
            // новых субъектов и дополняем по уже существующим субъектам.
            loadDeferred.then(function () {
                principalStore.on("New", function (item) {
                    itemStore.complementPrincipal(
                        principalStore.getValue(item, "principal_id")
                    );
                });

                principalStore.fetch({
                    onItem: function (item) {
                        var pid = principalStore.getValue(item, 'principal_id');
                        itemStore.complementPrincipal(pid);
                    }
                });

            }).then(null, _logError);

            // При удалении субъекта удаляем все записи разрешений
            principalStore.on("Delete", function(item) {
            });

            // Загружаем данные
            array.forEach(this.items, function(item) {
                var data = lang.clone(item);
                data['allow'] = true;
                data['deny'] = null;
                data['children'] = null;
                itemStore.newItem(data);
            }, this);

            loadDeferred.resolve();

            this._gridStructure = [
                { field: "principal_id", hidden: true },
                { field: "resource", hidden: true },
                { 
                    field: "_item", name: "Ресурс", width: "30%",
                    formatter: function (item) {
                        return securitySchema[itemStore.getValue(item, 'resource')]
                            .label
                    }
                }, { 
                    field: "_item", name: "Право", width: "70%",
                    formatter: function (item) {
                        return securitySchema[itemStore.getValue(item, 'resource')]
                            .permissions[itemStore.getValue(item, 'permission')]
                            .label
                    }
                },
                { field: "allow", name: 'Р', width: "16px", editable: true, cellType: cells.Bool, styles: 'text-align: center;'},
                { field: "deny", name: 'З', width: "16px", editable: true, cellType: cells.Bool, styles: 'text-align: center;'},
                { field: "node", name: 'О', width: "16px", editable: true, cellType: cells.Bool, styles: 'text-align: center;'}
                /* DEBUG: , { field: "operation"} */
            ];
            this._principalGridStruct = _userGridStructure;

        },

        startup: function () {
            this.inherited(arguments);
            
            if (this.items.length > 0) {
                this._principalSelect();
            };
        },

        _headerCellMouseOver: function (e) {
            var msg = 
                (e.cellNode.cellIndex == '4') ? "Разрешить" : (
                (e.cellNode.cellIndex == '5') ? "Запретить" : (
                (e.cellNode.cellIndex == '6') ? "Ограничить распространение" : null
            ));

            if (msg) {
                Tooltip.show(msg, e.cellNode);
                on.once(e.cellNode, mouse.leave, function(){
                    Tooltip.hide(e.cellNode);
                });

            };
        },

        _principalSelect: function (item) {
            var idx = item ? this.principalGrid.getItemIndex(item) : 0;
            this.principalGrid.selection.deselectAll();
            this.principalGrid.selection.addToSelection(idx);
            this._principalSelected(item);
        },

        _principalSelected: function (item) {
            var item = this.principalStore.isItem(item) ? item : this.principalGrid.selection.getSelected()[0];
            this.itemGrid.filter({principal_id: this.principalStore.getValue(item, "principal_id")})
        },

        _principalAdd: function () {
            var principal = this.principalSelect.get("item"),
                grid = this.principalGrid,
                store = this.principalStore,
                widget = this;

            store.fetch({
                query: { principal_id: principal.id },
                onComplete: function (items) {
                    var item;

                    if (items.length == 0) {
                        item = store.newItem({
                            principal_id: principal.id,
                            principal_cls: principal.cls,
                            principal_display_name: principal.display_name
                        });
                    } else {
                        item = items[0];
                    };

                    widget._principalSelect(item);
                    popup.close(widget.principalDialog);

                    // Почему-то фильтр не срабатывает сразу, так что
                    // обновим фильтр через 100мс
                    setTimeout(function() {
                        widget._principalSelected(item);
                    }, 100);
                }
            });
        },

        _principalDelete: function () {
            var item = this.principalGrid.selection.getSelected()[0],
                principalStore = this.principalStore,
                itemStore = this.itemStore;

            itemStore.fetch({
                query: { principal_id: principalStore.getValue(item, "principal_id") },
                onItem: function (item) {
                    itemStore.deleteItem(item);
                }
            });

            this.principalStore.deleteItem(item);
            this._principalSelect();
        },

        save: function () {
            var widget = this,
                store = this.itemStore,
                deferred = new Deferred();

            deferred.then(null, function (error) { console.error(error) });

            widget.itemStore.fetch({
                onComplete: function (items) {
                    var value = []
                    array.forEach(items, function (item) {
                        if (store.getValue(item, "operation") != widget.defaultOperation) {
                            value.push({
                                principal_id: store.getValue(item, "principal_id"),
                                resource: store.getValue(item, "resource"),
                                permission: store.getValue(item, "permission"),
                                operation: store.getValue(item, "operation")
                            });
                        };
                    });

                    xhr.post("", {
                        handleAs: "json",
                        data: json.stringify(value)
                    }).then(function () {
                        deferred.resolve();
                    }, function (error) {
                        deferred.reject(error);
                    }).then(null, function (error) { deferred.reject(error) } );
                },
                onError: function (error) { deferred.reject(error) }
            })
        }

    });
});