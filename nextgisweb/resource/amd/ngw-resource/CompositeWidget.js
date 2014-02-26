/* globals define, require, console */
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
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "dijit/TitlePane",
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
    Button,
    BorderContainer,
    ContentPane,
    TabContainer,
    TitlePane,
    route
) {
    var CompositeWidget = declare("ngw.resource.CompositeWidget", BorderContainer, {
        style: "width: 100%; height: 100%; padding: 1px;",
        gutters: false,

        buildRendering: function () {
            this.inherited(arguments);

            this.tabContainer = new TabContainer({
                region: "center"
            }).placeAt(this);
            
            this.btnContainer = new ContentPane({
                region: "bottom",
                style: "padding: 0; margin-top: 1ex;"
            }).placeAt(this);

            domClass.add(this.btnContainer.domNode, "ngwButtonStrip");

            this.members = [];

            for (var k in this.config) {
                var membercls = this.config[k].cls;
                var member = new membercls({composite: this});
                
                member.placeAt(this.tabContainer);
                this.members.push(member);
            }

            if (this.operation === "create") {

                new Button({
                    label: "Создать",
                    onClick: lang.hitch(this, this.createObj)
                }).placeAt(this.btnContainer);

            } else if (this.operation === "update") {

                new Button({
                    label: "Сохранить",
                    iconClass: "dijitIconSave",
                    onClick: lang.hitch(this, this.updateObj)
                }).placeAt(this.btnContainer);

            }

            if (this.operation === "read" || this.operation === "update") {
                new Button({
                    label: "Обновить",
                    iconClass: "dijitIconConnector",
                    onClick: lang.hitch(this, this.refreshObj)
                }).placeAt(this.btnContainer);
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
            return xhr(args.url, {
                method: args.method,
                handleAs: "json",
                data: json.stringify(args.data),
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });
        },

        itemUrl: function () {
            return route("resource.child", {
                id: (this.parent !== null) ? this.parent : "-",
                child_id: this.id
            });
        },

        collectionUrl: function () {
            return route("resource.child", {
                id: (this.parent !== null) ? this.parent : "-",
                child_id: ""
            });
        },

        apiReq: function (args) {
            var widget = this,
                deferred = new Deferred();

            this.validateData().then(
                function /* callback */ (success) {
                    if (success) {
                        console.debug("Validation completed");
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
                                    function /* errback */ (err) { console.error(err); }
                                );
                            },
                            function /* errback */ (err) { console.error(err); }
                        );
                    } else {
                        console.info("Validation failed");
                    }
                },
                function /* errback */ (err) { console.error(err); }
            ).then(null, console.error);

            return deferred;
        },


        // Всякие действия и кнопки
        // ========================
        
        createObj: function () {
            this.tabContainer.set("disabled", true);

            this.apiReq({
                url: this.collectionUrl(),
                method: "POST"
            }).then(function /* callback */ (data) {
                window.location = route("resource.show", {id: data.id});
            });
        },

        updateObj: function () {
            this.tabContainer.set("disabled", true);
            // TODO: PATCH заменить на POST
            this.apiReq({
                url: this.itemUrl(),
                method: "PATCH"
            });
        },

        refreshObj: function () {
            xhr(this.itemUrl(), {
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