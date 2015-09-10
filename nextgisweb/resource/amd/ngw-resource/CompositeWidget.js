/* globals define, require, console, alert */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/json",
    "dojo/request/xhr",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/when",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "ngw-pyramid/i18n!resource",
    "ngw/route",
    "xstyle/css!./resource/CompositeWidget.css"
], function (
    declare,
    lang,
    array,
    json,
    xhr,
    Deferred,
    all,
    when,
    domClass,
    domStyle,
    Button,
    BorderContainer,
    ContentPane,
    TabContainer,
    i18n,
    route
) {
    var E_INVALID_DATA = "INVALID_DATA",
        E_SERIALIZE    = "SERIALIZE",
        E_REQUEST      = "REQUEST";

    var CompositeWidget = declare("ngw.resource.CompositeWidget", BorderContainer, {
        style: "width: 100%; height: 100%; padding: 1px;",
        gutters: false,

        buildRendering: function () {
            this.inherited(arguments);

            this.tabContainer = new TabContainer({
                region: "center"
            }).placeAt(this);

            this.lockContainer = new ContentPane({
                region: "center",
                style: "display: none; border: 1px solid silver;",
                content: i18n.gettext("Please wait. Processing request...")
            }).placeAt(this);

            this.btnContainer = new ContentPane({
                region: "top",
                style: "padding: 0; margin-bottom: 1ex;"
            }).placeAt(this);

            domClass.add(this.btnContainer.domNode, "ngwButtonStrip");

            this.members = [];

            for (var k in this.config) {
                var membercls = this.config[k].cls;
                var member = new membercls({composite: this});

                member.placeAt(this.tabContainer);
                this.members.push(member);
            }

            this.buttons = [];

            if (this.operation === "create") {

                this.buttons.push(new Button({
                    label: i18n.gettext("Create"),
                    iconClass: "dijitIconNewTask",
                    onClick: lang.hitch(this, function () { this.createObj(false); })
                }).placeAt(this.btnContainer));

                this.buttons.push(new Button({
                    label: i18n.gettext("Create and edit"),
                    iconClass: "dijitIconNewTask",
                    onClick: lang.hitch(this, function () { this.createObj(true); })
                }).placeAt(this.btnContainer));

            } else if (this.operation === "update") {

                this.buttons.push(new Button({
                    label: i18n.gettext("Save"),
                    iconClass: "dijitIconSave",
                    onClick: lang.hitch(this, this.updateObj)
                }).placeAt(this.btnContainer));

            } else if (this.operation === "delete") {

                this.buttons.push(new Button({
                    label: i18n.gettext("Delete"),
                    iconClass: "dijitIconDelete",
                    onClick: lang.hitch(this, this.deleteObj)
                }).placeAt(this.btnContainer));

            }

            if (this.operation === "read" || this.operation === "update") {

                // Отключаем кнопку Обновить, так как в текущем варианте
                // данная операция не корректно работает со следующими
                // виджетами: PermissionWidget, FieldsWidget, ItemWidget.
                // Обновить состояние виджета (вместе со страницей) можно по F5.

                // this.buttons.push(new Button({
                //     label: "Обновить",
                //     iconClass: "dijitIconConnector",
                //     onClick: lang.hitch(this, this.refreshObj)
                // }).placeAt(this.btnContainer));

            }

        },

        startup: function () {
            this.inherited(arguments);

            if (this.operation === "read" || this.operation === "update") {
                this.refreshObj();
            }
        },

        // Сериализация и валидация
        // ========================

        validateData: function () {
            var deferred = new Deferred(),
                promises = [],
                errors = [];

            // Регистрация ошибки, эта функция передается дочерним
            // виджетам в качестве параметра
            function errback(err) {
                errors.push(err);
            }

            array.forEach(this.members, function (member) {
                // Валидация может быть асинхронной, в этом случае
                // member.validate вернет deferred, собираем их в массив
                promises.push(when(member.validateData(errback)).then(
                    function /* callback */ (success) {
                        // Если валидация завершилась с ошибкой,
                        // отмечаем заголовок красным цветом

                        // TODO: Наверное есть способ сделать это как-то
                        // получше, например вешать специальный класс на
                        // ноду таба, но непонятно как ее обнаружить.
                        if (!success) { member.set("title", "<span style=\"color: #d00\">" + member.get("title") + "</span>"); }
                        return success;
                    }
                ));
            });

            all(promises).then(
                function /* callback */ (results) {
                    var success = true;

                    // Проверяем результаты всех членов, все должны
                    // вернуть истинное выражение
                    array.forEach(results, function (res) {
                        success = success && res;
                    });

                    // Так же как и дочерние виждеты составной виджет
                    // возвращает истину или ложь, и reject в случае ошибки.
                    deferred.resolve(success);
                },

                function /* errback */ (err) {
                    deferred.reject(err);
                }

            ).then(null, deferred.reject);

            return deferred;
        },

        serialize: function () {
            var promises = [];
            var data = { resource: {} };

            if (this.operation === "create") {
                data.resource.cls = this.cls;
                data.resource.parent = { id: this.parent };
            }

            array.forEach(this.members, function (member) {
                promises.push(when(member.serialize(data)));
            });

            return all(promises).then(function () {
                return data;
            }, console.error);
        },

        deserialize: function (data) {
            for (var k in this.members) {
                this.members[k].deserialize(data);
            }
        },

        // REST API
        // ========

        request: function (args) {
            var deferred = new Deferred();

            xhr(args.url, {
                method: args.method,
                handleAs: "json",
                data: json.stringify(args.data),
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            }).then(function (data) {
                deferred.resolve(data);
            }, function (err) {
                deferred.reject({
                    status: err.response.status,
                    data: err.response.data
                });
            });

            return deferred;
        },

        storeRequest: function (args) {
            var widget = this,
                deferred = new Deferred();

            this.validateData().then(
                function /* callback */ (success) {
                    if (success) {
                        console.debug("Validation completed with success");
                        widget.serialize().then(
                            function /* callback */ (data) {
                                console.debug("Serialization completed");
                                widget.request({
                                    url: args.url,
                                    method: args.method,
                                    data: data
                                }).then(
                                    function /* callback */ (response) {
                                        console.debug("REST API request completed");
                                        deferred.resolve(response);
                                    },
                                    function /* errback */ (err) {
                                        console.debug("REST API request failed");
                                        deferred.reject({
                                            error: E_REQUEST,
                                            status: err.status,
                                            data: err.data
                                        });
                                    }
                                );
                            },
                            function /* errback */ () {
                                console.debug("Serialization failed");
                                deferred.reject({ error: E_SERIALIZE });
                            }
                        );
                    } else {
                        console.debug("Validation completed without success");
                        deferred.reject({ error: E_INVALID_DATA });
                    }
                },
                function /* errback */ () {
                    console.debug("Validation failed");
                    deferred.reject({ error: E_SERIALIZE });
                }
            ).then(null, console.error);

            return deferred;
        },


        // Всякие действия и кнопки
        // ========================

        lock: function () {
            domStyle.set(this.tabContainer.domNode, "display", "none");
            domStyle.set(this.lockContainer.domNode, "display", "block");
            array.forEach(this.buttons, function (btn) {
                btn.set("disabled", true);
            });
        },

        unlock: function (err) {
            domStyle.set(this.lockContainer.domNode, "display", "none");
            domStyle.set(this.tabContainer.domNode, "display", "block");
            array.forEach(this.buttons, function (btn) {
                btn.set("disabled", false);
            });
            this.tabContainer.resize();

            if (err !== undefined) { this.errorMessage(err); }
        },

        errorMessage: function (e) {
            var S_ERROR_MESSAGE = i18n.gettext("Error message:")

            if (e.error == E_REQUEST && e.status == 400) {
                alert(i18n.gettext("Errors found during data validation on server. Correct error and try again.") + " " + S_ERROR_MESSAGE + "\n" + e.data.message);

            } else if (e.error == E_REQUEST && e.status == 403) {
                alert(i18n.gettext("Insufficient permissions to perform the operation.") + " " + S_ERROR_MESSAGE + "\n" + e.data.message);

            } else if (e.error == E_INVALID_DATA) {
                alert(i18n.gettext("Errors found during data validation. Tabs with errors marked in red."));

            } else {
                alert(i18n.gettext("Unexpected error occurred during the operation.") + " " + S_ERROR_MESSAGE + "\n" + e.data.message);
            }
        },

        createObj: function (edit) {
            this.lock();

            this.storeRequest({
                url: route.resource.collection(),
                method: "POST"
            }).then(
                /* callback */ lang.hitch(this, function (data) {
                    if (edit) {
                        window.location = route.resource.update({id: data.id});
                    } else {
                        window.location = route.resource.show({id: data.id});
                    }
                }),
                /* errback  */ lang.hitch(this, this.unlock)
            );
        },

        updateObj: function () {
            this.lock();

            this.storeRequest({
                url: route.resource.item(this.id),
                method: "PUT"
            }).then(
                /* callback */ lang.hitch(this, function () {
                    this.unlock();
                }),
                /* errback  */ lang.hitch(this, this.unlock)
            ).then(null, console.error);
        },

        deleteObj: function () {
            this.lock();

            this.storeRequest({
                url: route.resource.item(this.id),
                method: "DELETE"
            }).then(
                /* callback */ lang.hitch(this, function () {
                    window.location = route.resource.show({id: this.parent});
                    this.unlock();
                }),
                /* errback  */ lang.hitch(this, this.unlock)
            ).then(null, console.error);
        },

        refreshObj: function () {
            xhr(route.resource.item(this.id), {
                handleAs: "json"
            }).then(
                lang.hitch(this, this.deserialize)
            ).otherwise(console.error);
        },
    });

    CompositeWidget.bootstrap = function (options) {
        var deferred = new Deferred();

        var amdmod = [];
        for (var i in options.config) { amdmod.push(i); }
        require(amdmod, function () {
            for (var i = 0; i < amdmod.length; i++) {
                var cls = arguments[i];
                options.config[amdmod[i]].cls = cls;
            }
            deferred.resolve(new CompositeWidget(options));
        });

        return deferred;
    };

    return CompositeWidget;
});
