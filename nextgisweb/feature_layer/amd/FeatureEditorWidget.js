define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/number",
    "dijit/_WidgetBase",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/form/NumberTextBox",
    "dijit/form/DateTextBox",
    "dijit/form/TimeTextBox",
    "dijit/form/CheckBox",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dojox/layout/TableContainer",
    "ngw/route",
    "xstyle/css!./resource/FeatureEditorWidget.css"
], function (
    declare,
    lang,
    array,
    xhr,
    json,
    domClass,
    domConstruct,
    number,
    _WidgetBase,
    Button,
    TextBox,
    NumberTextBox,
    DateTextBox,
    TimeTextBox,
    CheckBox,
    ContentPane,
    BorderContainer,
    TabContainer,
    TableContainer,
    route
) {
    var MultiBox = declare([_WidgetBase], {
        datatype: "STRING",

        buildRendering: function () {
            this.domNode = domConstruct.create("div");
            this.buildWidget();
        },

        buildWidget: function() {
            this.nullbox = new CheckBox({
                style: "margin-right: 1ex;"
            }).placeAt(this);

            if (this.datatype == 'INTEGER') {
                this.children = [
                    (new NumberTextBox({
                        constraints: {fractional: false},
                        style: "width: 12em;"
                    })).placeAt(this)
                ];
            } else if (this.datatype == 'REAL') {
                this.children = [
                    (new NumberTextBox({
                        constraints: {places: "0,20"},
                        style: "width: 12em;"
                    })).placeAt(this)
                ]
            } else if (this.datatype == 'STRING') {
                this.children = [
                    (new TextBox({
                        style: "width: calc(100% - 20px - 1ex)"
                    })).placeAt(this)
                ];
            } else if (this.datatype == 'DATE') {
                this.children = [
                    (new DateTextBox({
                        style: "width: 12em;"
                    })).placeAt(this)
                ];
            } else if (this.datatype == 'TIME') {
                this.children = [
                    (new TimeTextBox({
                        style: "width:12em;",
                        constraints: {
                            timePattern: "HH:mm:ss",
                            clickableIncrement: 'T01:00:00'
                        }
                    })).placeAt(this)
                ];
            } else if (this.datatype == 'DATETIME') {
                this.children = [
                    (new DateTextBox({
                        style: "width: 12em;"
                    })).placeAt(this),

                    (new TimeTextBox({
                        style: "width:12em; margin-left: 1em;",
                        constraints: {
                            timePattern: "HH:mm:ss",
                            clickableIncrement: 'T01:00:00'
                        }
                    })).placeAt(this)
                ];
            }

            var widget = this;
            this.nullbox.watch("checked", function (attr, oval, nval) {
                array.forEach(widget.children, function (c) {
                    c.set("disabled", !nval);
                }, this);
            });

            this.nullbox.set("checked", true);
            this.nullbox.set("checked", false);
        },

        _setValueAttr: function (value) {
            this._set("value", value);
            this.nullbox.set("checked", value != null);

            if (this.datatype == 'INTEGER' || this.datatype == 'REAL') {
                this.children[0].set("value", value == null ? 0 : value);
            } else if (this.datatype == 'STRING') {
                this.children[0].set("value", value == null ? "" : value);
            } else if (this.datatype == 'DATE') {
                var fp = function (v, p) { return number.format(v, {pattern: p})};
                this.children[0].set("value", value == null ? null : new Date(value.year, value.month - 1, value.day));
            } else if (this.datatype == 'TIME') {
                this.children[0].set("value", value == null ? null : new Date(0, 0, 0, value.hour, value.minute, value.second));
            } else if (this.datatype = 'DATETIME') {
                this.children[0].set("value", value == null ? null : new Date(value.year, value.month - 1, value.day));
                this.children[1].set("value", value == null ? null : new Date(0, 0, 0, value.hour, value.minute, value.second));
            }
        },

        _getValueAttr: function () {
            if (this.nullbox.get("checked") == false) { return null };

            if (this.datatype == 'INTEGER' || this.datatype == 'REAL' || this.datatype == 'STRING') {
                return this.children[0].get("value");
            } else if (this.datatype == 'DATE') {
                var v = this.children[0].get("value");
                return {
                    year: v.getFullYear(),
                    month: v.getMonth() + 1,
                    day: v.getDate() };
            } else if (this.datatype == 'TIME') {
                var v = this.children[0].get("value");
                return {
                    hour: v.getHours(),
                    minute: v.getMinutes(),
                    second: v.getSeconds() }
            } else if (this.datatype = 'DATETIME') {
                var d = this.children[0].get("value");
                var t = this.children[1].get("value");
                return {
                    year: d.getFullYear(),
                    month: d.getMonth() + 1,
                    day: d.getDate(),
                    hour: t.getHours(),
                    minute: t.getMinutes(),
                    second: t.getSeconds() };
            }
        }
    });

    var FieldsWidget = declare([TableContainer], {
        title: "Атрибуты",
        style: "padding: 1ex; height: 100%;",
        labelWidth: "20%",

        buildRendering: function () {
            this.inherited(arguments);

            this._fmap = {};

            array.forEach(this.fields, function (f) {
                this._fmap[f.keyname] = new MultiBox({
                    label: f.keyname,
                    datatype: f.datatype
                });
                this._fmap[f.keyname].placeAt(this);
            }, this);
        },

        _setValueAttr: function (data) {
            array.forEach(this.fields, function (f) {
                this._fmap[f.keyname].set("value", data[f.keyname]);
            }, this);
        },

        _getValueAttr: function () {
            var data = {};

            array.forEach(this.fields, function (f) {
                data[f.keyname] = this._fmap[f.keyname].get("value");
            }, this);

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
                region: "top",
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
