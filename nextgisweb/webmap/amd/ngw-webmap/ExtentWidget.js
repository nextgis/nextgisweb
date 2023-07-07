define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/request/xhr",
    "ngw-pyramid/route",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "@nextgisweb/pyramid/i18n!",
    // resource
    "dojo/text!./template/ExtentWidget.hbs",
    // template
    "dijit/form/NumberTextBox",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer",
    "ngw-resource/ResourceBox",
    //css
    "xstyle/css!./template/resources/ExtentWidget.css"
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
    template
) {
    return declare([_WidgetBase, serialize.Mixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        title: i18n.gettext("Extent and bookmarks"),
        templateString: i18n.renderTemplate(template),
        serializePrefix: "webmap",

        postCreate: function () {
            this.inherited(arguments);

            // Layer selection and get its extent
            this.btnSetExtentFromLayer.on("click",
                lang.hitch(this, function () {
                    this.layerPicker.pick().then(lang.hitch(this,
                        function (itm) {
                            xhr(route.layer.extent({ id: itm.id }), {
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

            this.btnSetConstrainingExtent.on("click",
                lang.hitch(this, function () {
                    this.layerPicker.pick().then(lang.hitch(this,
                        function (itm) {
                            xhr(route.layer.extent({ id: itm.id }), {
                                method: "GET",
                                handleAs: "json"
                            }).then(lang.hitch(this, function (data) {
                                var extent = data.extent;
                                this.wExtentLeftConst.set("value", extent.minLon);
                                this.wExtentRightConst.set("value", extent.maxLon);
                                this.wExtentTopConst.set("value", extent.maxLat);
                                this.wExtentBottomConst.set("value", extent.minLat);
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

            value.extent_const_left = this.wExtentLeftConst.get("value");
            value.extent_const_right = this.wExtentRightConst.get("value");
            value.extent_const_top = this.wExtentTopConst.get("value");
            value.extent_const_bottom = this.wExtentBottomConst.get("value");
        },

        deserializeInMixin: function (data) {
            var value = data.webmap;

            this.wExtentLeft.set("value", value.extent_left);
            this.wExtentRight.set("value", value.extent_right);
            this.wExtentTop.set("value", value.extent_top);
            this.wExtentBottom.set("value", value.extent_bottom);

            this.wExtentLeftConst.set("value", value.extent_const_left);
            this.wExtentRightConst.set("value", value.extent_const_right);
            this.wExtentTopConst.set("value", value.extent_const_top);
            this.wExtentBottomConst.set("value", value.extent_const_bottom);
        }
    });
});