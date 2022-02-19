define(["dojo/_base/declare", "@nextgisweb/gui/error"], function (
    declare,
    errorModule
) {
    // prettier-ignore
    console.warn(
        "Module 'ngw-pyramid/ErrorDialog/ErrorDialog' has been deprecated! " +
        "Use '@nextgisweb/gui/error' instead!");

    // Legacy error dialog wrapper
    var ErrorDialog = declare([], {
        constructor: function (error) {
            this.inherited(arguments);
            this.error = error;
        },

        show: function () {
            errorModule.errorModal(this.error);
        },
    });

    // Static method for easy handling xhr errors
    ErrorDialog.xhrError = function (error) {
        var dialog = new ErrorDialog({ response: error.response });
        dialog.show();
        return dialog;
    };

    return ErrorDialog;
});
