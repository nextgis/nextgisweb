define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/dom-class",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dojox/layout/TableContainer",
    "ngw/route",
    "xstyle/css!./resource/FeatureWidget.css"
], function (
    declare,
    lang,
    xhr,
    json,
    domClass,
    Button,
    TextBox,
    ContentPane,
    BorderContainer,
    TabContainer,
    TableContainer,
    route
) {
    var FieldsWidget = declare([TableContainer], {
        title: "Атрибуты",
        style: "padding: 1ex; height: 100%;",
        labelWidth: "20%",

        buildRendering: function () {
            this.inherited(arguments);

            this._fmap = {};

            for (var i in this.fields) {
                var w = new TextBox({
                    label: this.fields[i],
                    style: "width: 100%;"
                });
                w.placeAt(this);
                this._fmap[this.fields[i]] = w;
            };
        },

        _setValueAttr: function (data) {
            for (var i in this.fields) {
                var fkn = this.fields[i];
                this._fmap[fkn].set("value", data[fkn]);
            };
        },

        _getValueAttr: function () {
            var data = {};
            for (var i in this.fields) {
                var fkn = this.fields[i];
                data[fkn] = this._fmap[fkn].get("value");
            };
            return data;
        }
    });


    return declare([BorderContainer], {
        gutters: false,

        buildRendering: function () {
            this.inherited(arguments);

            this._tabContainer = new TabContainer({region: "center"});
            this._tabContainer.placeAt(this);

            this._fwidget = new FieldsWidget({fields: this.fields}).placeAt(this._tabContainer);

            this._ext = {};
            for (var k in this.extmid) {
                var widget = new this.extmid[k]({
                    resource: this.resource,
                    feature: this.feature
                });
                widget.placeAt(this._tabContainer);
                this._ext[k] = widget;
            };

            this._btnPane = new ContentPane({
                region: "bottom",
                style: "padding-left: 0; padding-right: 0"
            });

            this._btnPane.placeAt(this);
            domClass.add(this._btnPane.domNode, "ngwButtonStrip");

            new Button({
                label: "Сохранить",
                iconClass: "dijitIconSave",
                onClick: lang.hitch(this, this.save)
            }).placeAt(this._btnPane);
        }, 

        iurl: function () {
            return route.feature_layer.feature.item({
                id: this.resource,
                fid: this.feature
            });
        },

        load: function () {
            var widget = this;

            xhr(this.iurl(), {
                method: 'GET',
                handleAs: 'json'
            }).then(function (data) {
                widget._fwidget.set("value", data.fields);
                for (var k in widget.extmid) {
                    widget._ext[k].set("value", data.extensions[k]);
                };
            });
        },

        save: function () {
            var widget = this;
            var data = {
                fields: this._fwidget.get("value"),
                extensions: {}
            };

            for (var k in widget.extmid) {
                data.extensions[k] = widget._ext[k].get("value");
            };

            xhr(this.iurl(), {
                method: "PUT",
                handleAs: "json",
                data: json.stringify(data)
            }).then(function () {
                widget.load();
            });
        }
    });
})