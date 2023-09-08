define([
    "dojo/_base/declare",
    "dojo/json",
    "dijit/form/FilteringSelect",
    "dijit/form/CheckBox",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "./QMSStore",
    "@nextgisweb/pyramid/i18n!",
    "ngw-resource/serialize",
    "dojo/text!./template/LayerWidget.hbs",
    "@nextgisweb/pyramid/settings!",
    // template
    "dijit/form/ValidationTextBox",
    "dojox/layout/TableContainer",
], function (
    declare,
    json,
    FilteringSelect,
    CheckBox,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    QMSStore,
    i18n,
    serialize,
    template,
    settings
) {
    return declare(
        [
            _WidgetBase,
            _TemplatedMixin,
            _WidgetsInTemplateMixin,
            serialize.Mixin,
        ],
        {
            title: i18n.gettext("Basemap"),
            templateString: i18n.renderTemplate(template),
            prefix: "basemap_layer",

            postCreate: function () {
                this.inherited(arguments);

                if (settings.qms_geoservices_url) {
                    var widget = this;

                    var qmsStore = new QMSStore({
                        idProperty: "id",
                        queryOptions: { "type": "tms" },
                    });

                    this.qmsSearch = new FilteringSelect({
                        autoComplete: false,
                        searchAttr: "name",
                        queryExpr: "${0}",
                        store: qmsStore,
                        hasDownArrow: false,
                        title: i18n.gettext("Search"),
                        maxHeight: 200,
                        style: { width: "100%" },
                    });

                    this.qmsSettings = new CheckBox({
                        disabled: true,
                        title: i18n.gettext("Use options from QMS"),
                    });

                    this.container.addChild(this.qmsSearch, "first");
                    this.container.addChild(this.qmsSettings);

                    this.qmsSettings.watch(
                        "checked",
                        function (attr, oval, nval) {
                            widget.url.set("disabled", nval);
                            widget.copyrightText.set("disabled", nval);
                            widget.copyrightUrl.set("disabled", nval);
                        }
                    );

                    widget.url.on("input", function () {
                        widget.qmsSettings.set("disabled", true);
                    });

                    this.qmsSearch.watch("value", function (attr, oval, nval) {
                        qmsStore.get(nval).then(function (service) {
                            widget.qms = service;
                            widget.url.set("disabled", true);
                            widget.copyrightText.set("disabled", true);
                            widget.copyrightUrl.set("disabled", true);
                            widget.url.set("value", service.url);
                            widget.copyrightText.set("value", "");
                            widget.copyrightUrl.set("value", "");

                            widget.qmsSettings.set("disabled", false);
                            widget.qmsSettings.set("checked", true);
                        });
                    });
                }
            },

            serializeInMixin: function (data) {
                var value = data.basemap_layer;

                if (this.qms && this.qmsSettings.get("checked")) {
                    value.qms = json.stringify(this.qms);
                } else {
                    value.qms = null;
                }

                if (value.copyright_text === "") {
                    value.copyright_text = null;
                }
                if (value.copyright_url === "") {
                    value.copyright_url = null;
                }
            },

            deserializeInMixin: function (data) {
                var value = data.basemap_layer;

                if (value.qms && settings.qms_geoservices_url) {
                    this.qms = json.parse(value.qms);
                    this.qmsSettings.set("disabled", false);
                    this.qmsSettings.set("checked", true);
                }
            },
        }
    );
});
