define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/Tooltip",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/pyramid/i18n!",
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
    xhr,
    json,
    route,
    ErrorDialog,
    i18n,
    template
) {
    var PROFILE_URL = route.auth.profile();

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        postCreate: function () {
            this.inherited(arguments);

            xhr.get(PROFILE_URL, {
                handleAs: "json"
            }).then(function (data) {
                this.language.set("value", data.language, false);
            }.bind(this));
        },

        startup: function () {
            this.inherited(arguments);

            this.language.on("change", function (value) {
                var data = { language: value };
                this.save(data);
            }.bind(this));
        },

        save: function (data) {
            xhr.put(PROFILE_URL, {
                handleAs: "json",
                headers: {
                    "Content-Type": "application/json"
                },
                data: json.stringify(data)
            }).then(
                function () {
                    Tooltip.show(i18n.gettext("Saved"), this.language.domNode);
                    setTimeout(function () {
                        Tooltip.hide(this.language.domNode)
                    }.bind(this), 1000);
                }.bind(this),
                ErrorDialog.xhrError
            );
        }
    });
});
