define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dijit/Dialog",
    "ngw-pyramid/ErrorCard/ErrorCard",
    "ngw-pyramid/i18n!resource",
    "xstyle/css!./ErrorDialog.css"
], function (
    declare,
    lang,
    domClass,
    domConstruct,
    Dialog,
    ErrorCard,
    i18n
) {
    return declare([Dialog], {
        constructor: function (options) {
            this.inherited(arguments);
            if (options.response) {
                var response = options.response;

                if (response.status == undefined || response.status == 0) {
                    this.errorTitle = i18n.gettext("Network error");
                    this.message = i18n.gettext("There is no response from the server or problem connecting to server.");
                    this.detail = i18n.gettext("Check network connectivity and try again later.");
                } else if (response.status >= 400 && response.status <= 599) {
                    var data = response.data;
                    this.errorTitle = data.title;
                    this.message = data.message;
                    this.detail = data.detail;
                    this.error = data;
                } else {
                    this.errorTitle = i18n.gettext("Unexpected server response");
                    this.message = i18n.gettext("Something went wrong.");
                };

                this.errorCard = new ErrorCard({
                    error: data || {},
                    errorTitle: this.errorTitle,
                    message: this.message,
                    detail: this.detail,
                    mainActionText: 'OK',
                    mainActionUrl: '#'
                });
            };
        },

        buildRendering: function () {
            this.inherited(arguments);
            domClass.add(this.domNode, 'ngwPyramidErrorDialog');
            domConstruct.place(this.errorCard.domNode, this.containerNode, 'last');
            this.errorCard.mainAction.addEventListener('click', lang.hitch(this, function() {
               this.hide();
            }));

            this.errorCard.on('technicalInfoToggled', lang.hitch(this, function() {
                this.resize();
            }));
        },

        startup: function () {
            this.inherited(arguments);
            this.errorCard.startup();
        }
    })
})
