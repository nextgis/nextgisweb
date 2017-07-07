/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "ngw/route",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!webmap",
    "ngw-pyramid/hbs-i18n",
    // resource
    "dojo/text!./template/ExtentWidget.hbs",
    // template
    "dijit/form/NumberTextBox",
    "dojox/layout/TableContainer",
    "ngw-resource/ResourceBox"
], function (
    declare,
    lang,
    xhr,
    route,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    hbsI18n,
    template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("Extent and bookmarks"),
        templateString: hbsI18n(template, i18n),
        serializePrefix: "webmap",

       postCreate: function () {
            this.inherited(arguments);

            // Layer selection and get its extent
            this.btnSetExtentFromLayer.on("click",
                lang.hitch(this, function () {
                    this.layerPicker.pick().then(lang.hitch(this,
                        function (itm) {
                            xhr(route.layer.extent({id: itm.id}), {
                                method: "GET",
                                handleAs: "json"
                            }).then(lang.hitch(this, function (data) {
                                var extent = data.extent;
                                this.wExtentLeft.set("value", extent.minLon);
                                this.wExtentRight.set("value", extent.maxLon);
                                this.wExtentTop.set("value", extent.maxLat);
                                this.wExtentBottom.set("value", extent.minLat);
                            }));
                        }
                    ));
                })
            );
        },

        serializeInMixin: function (data) {
            if (data.webmap === undefined) { data.webmap = {}; }
            var value = data.webmap;

            value.extent_left = this.wExtentLeft.get("value");
            value.extent_right = this.wExtentRight.get("value");
            value.extent_top = this.wExtentTop.get("value");
            value.extent_bottom = this.wExtentBottom.get("value");
        },

        deserializeInMixin: function (data) {
            var value = data.webmap;
            this.wExtentLeft.set("value", value.extent_left);
            this.wExtentRight.set("value", value.extent_right);
            this.wExtentTop.set("value", value.extent_top);
            this.wExtentBottom.set("value", value.extent_bottom);
        }
    });
});
