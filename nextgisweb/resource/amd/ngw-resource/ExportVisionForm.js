define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/request/xhr",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/pyramid/i18n!",
    "dojo/text!./template/ExportVisionForm.hbs",
    // template
    "dijit/form/Button",
    "dijit/form/Select"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    xhr,
    route,
    ErrorDialog,
    i18n,
    template
) {
    var API_URL = route.resource.export_vision();

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        postCreate: function () {
            this.inherited(arguments);
            this.buttonSave.on("click", this.save.bind(this));
        },

        startup: function () {
            this.inherited(arguments);
            xhr.get(API_URL, {
                handleAs: "json"
            }).then(function (data) {
                this.wExportVision.set("value", data.export_vision);
            }.bind(this));
        },

        save: function () {
            xhr.put(API_URL, {
                handleAs: "json",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    export_vision: this.wExportVision.get("value")
                })
            }).then(
                function () {
                    window.location.reload(true);
                },
                ErrorDialog.xhrError
            );
        }
    });
});
