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
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "dijit/TitlePane",
    "ngw/route"
], function (
    declare,
    lang,
    array,
    json,
    xhr,
    Deferred,
    all,
    when,
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
                    onClick: lang.hitch(this, this.updateObj)
                }).placeAt(this.btnContainer);

            }

            if (this.operation === "read" || this.operation === "update") {
                new Button({
                    label: "Обновить",
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

        // Serialization and validation
        // ============================

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
            }, console.error).otherwise(console.error);
        },

        deserialize: function (data) {
            for (var k in this.members) {
                this.members[k].deserialize(data);
            }
        },

        // REST API interaction
        // ====================

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

        // Widget action and buttons
        // =========================
        
        createObj: function () {
            this.serialize().then(lang.hitch(this, function (data) {
                xhr(this.collectionUrl(), {
                    method: "POST",
                    data: json.stringify(data),
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    handleAs: "json"
                });
            })).otherwise(console.error);
        },

        updateObj: function () {
            this.serialize().then(lang.hitch(this, function (data) {
                xhr(this.itemUrl(), {
                    method: "PATCH",
                    data: json.stringify(data),
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    handleAs: "json"
                });
            })).otherwise(console.error);
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