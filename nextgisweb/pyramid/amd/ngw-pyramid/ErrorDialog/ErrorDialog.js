define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dijit/Dialog",
    "ngw-pyramid/ErrorCard/ErrorCard",
    "@nextgisweb/pyramid/i18n!",
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
    var ErrorDialog = declare([Dialog], {
        constructor: function (error) {
            this.inherited(arguments);

            this.errorInfo = {};

            // Temporary solution to detect instance of @nextgisweb/pyramid/api/BaseAPIError
            if (error.name && error.message && error.title) {
                this.message = error.message;
                this.detail = error.detail;
                this.errorTitle = error.title;
                this.errorInfo = error.data || {};
            } else if (error.response) {
                var response = error.response;

                if (response.status == undefined || response.status == 0 || response.data == undefined) {
                    this.errorTitle = i18n.gettext("Network error");
                    this.message = i18n.gettext("There is no response from the server or problem connecting to server.");
                    this.detail = i18n.gettext("Check network connectivity and try again later.");
                } else if (response.status >= 400 && response.status <= 599) {
                    var data = response.data;
                    this.errorTitle = data.title;
                    this.message = data.message;
                    this.detail = data.detail;
                    this.errorInfo = data;
                } else {
                    this.errorTitle = i18n.gettext("Unexpected server response");
                    this.message = i18n.gettext("Something went wrong.");
                }
            } else {
                this.errorTitle = error.title;
                this.message = error.message;
            }

            this.errorCard = new ErrorCard({
                error: this.errorInfo,
                errorTitle: this.errorTitle,
                message: this.message,
                detail: this.detail,
                mainActionText: 'OK',
                mainActionUrl: '#'
            });
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
    });

    // Static method for easy handling xhr errors
    ErrorDialog.xhrError = function (error) {
        var dialog = new ErrorDialog({response: error.response});
        dialog.show();
        return dialog;
    }
    
    ErrorDialog.showMessage = function (title, message) {
        var dialog = new ErrorDialog({
            title, 
            message
        });
        dialog.show();
        return dialog;
    }

    return ErrorDialog;
})
