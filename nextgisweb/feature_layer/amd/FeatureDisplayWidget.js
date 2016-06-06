define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "dojo/dom-construct",
    "dijit/_WidgetBase",
    "ngw/route",
    "./FieldsDisplayWidget"
], function (
    declare,
    lang,
    xhr,
    domConstruct,
    _WidgetBase,
    route,
    FieldsDisplayWidget
) {
    function h(text, node) {
        domConstruct.place(domConstruct.create("h2", {innerHTML: text}), node);
    }

    return declare([_WidgetBase], {
        buildRendering: function () {
            this.inherited(arguments);

            this._wfields = new FieldsDisplayWidget({
                resourceId: this.resourceId,
                featureId: this.featureId,
                fields: this.fields
            });
            h(this._wfields.title, this.domNode);
            
            var contentBox = domConstruct.create("div", {class:"content-box"},this.domNode);
            this._wfields.placeAt(contentBox);

            this._ext = {};
            for (var k in this.extmid) {
                var widget = new this.extmid[k]({
                    resourceId: this.resourceId,
                    featureId: this.featureId
                });

                h(widget.title, this.domNode);
            
                widget.placeAt(this);

                this._ext[k] = widget;
            }
        },

        url: function () {
            return route.feature_layer.feature.item({
                id: this.resourceId,
                fid: this.featureId
            });
        },

        load: function () {
            xhr(this.url(), {
                method: "GET",
                handleAs: "json"
            }).then(lang.hitch(this, function (value) {
                this.renderValue(value);
            }));
        },

        renderValue: function (value) {
            this._wfields.renderValue(value.fields);
            for (var k in this._ext) {
                this._ext[k].renderValue(value.extensions[k]);
            }
        }

    });
});
