define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Tooltip",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/i18n!",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "dojo/text!./template/SettingsForm.hbs",
    // template
    "dijit/layout/BorderContainer",
    "dojox/layout/TableContainer",
    "ngw-pyramid/form/LangSelect"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    Tooltip,
    api,
    i18n,
    ErrorDialog,
    template
) {
    var profileRoute = api.route('auth.profile');

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        postCreate: function () {
            this.inherited(arguments);

            profileRoute.get().then(
                function (data) {
                    this.language.set("value", data.language, false)    
                }.bind(this),
                function (err) { new ErrorDialog(err).show() }
            )
        },

        startup: function () {
            this.inherited(arguments);

            this.language.on("change", function (value) {
                var data = { language: value };
                this.save(data);
            }.bind(this));
        },

        save: function (data) {
            profileRoute.put({json: data}).then(
                function () {
                    Tooltip.show(i18n.gettext("Saved"), this.language.domNode);
                    setTimeout(function () {
                        Tooltip.hide(this.language.domNode)
                    }.bind(this), 1000);
                }.bind(this),
                function (err) { new ErrorDialog(err).show() }
            )
        }
    });
});
