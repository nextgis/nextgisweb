/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "ngw-pyramid/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "ngw-pyramid/i18n!pyramid",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/LogoForm.hbs",
    // template
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "ngw-file-upload/ImageUploader",
    "dijit/form/Button"
], function (
    declare,
    Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    xhr,
    json,
    route,
    ErrorDialog,
    i18n,
    hbsI18n,
    template
) {
    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        current_image: null,
        templateString: hbsI18n(template, i18n),

        postCreate: function () {
            this.inherited(arguments);

            this.buttonSave.on("click", this.save.bind(this));
            this.buttonCancel.on("click", this._go_home);
        },

        startup: function () {
            this.inherited(arguments);
            if (this.current_image) {
                this.wFile.setImage(this.current_image);
            }
        },

        save: function () {
            var data = this.wFile.get("value");
            if (data !== undefined) {
                xhr.put(route.pyramid.logo(), {
                    handleAs: 'json',
                    headers: { "Content-Type": "application/json" },
                    data: json.stringify(data)
                }).then(
                    this._go_home,
                    ErrorDialog.xhrError
                );
            } else {
                this._go_home();
            }
        },

        _go_home: function () {
            window.location = route.pyramid.control_panel();
        }
    });
});
