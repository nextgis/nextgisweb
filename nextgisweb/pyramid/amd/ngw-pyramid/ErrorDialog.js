define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/json",
    "dijit/Dialog",
    "dijit/form/Button",
    "put-selector/put",
    "ngw/settings!pyramid",
    "ngw-pyramid/form/CodeMirror",
    "ngw-pyramid/i18n!resource",
    "xstyle/css!./ErrorDialog.css"
], function (
    declare, 
    lang,
    domClass,
    domStyle,
    json,
    Dialog,
    Button,
    put,
    settings,
    CodeMirror,
    i18n
) {
    return declare([Dialog], {
        title: "Error",

        constructor: function (options) {
            this.inherited(arguments);

            if (options.response) {
                var response = options.response;
                if (response.status == undefined || response.status == 0) {
                    this.title = i18n.gettext("Network error");
                    this.message = i18n.gettext("There is no response from the server or problem connecting to server.");
                    this.detail = i18n.gettext("Check network connectivity and try again later.");
                } else if (response.status >= 400 && response.status <= 599) {
                    var data = response.data;
                    this.title = data.title;
                    this.message = data.message;
                    this.detail = data.detail;
                    this.error = data;
                } else {
                    this.title = i18n.gettext("Unexpected server response");
                    this.message = i18n.gettext("Something went wrong.");
                };
            };

            if (options.title) { this.title = options.title };
            if (options.message) { this.title = options.message };
            if (options.detail) { this.title = options.detail };
                  
            this.title = this.title || i18n.gettext("Unexpected error");
            this.message = this.message || i18n.gettext("Something went wrong.");
            this.detail = this.detail || null;
            this.error = this.error || {};           
        },

        buildRendering: function () {
            this.inherited(arguments);
            domClass.add(this.domNode, "ngwPyramidErrorDialog");

            this.contentArea = put(this.containerNode, 'div.dijitDialogPaneContentArea');
            this.actionBar = put(this.containerNode, 'div.dijitDialogPaneActionBar');

            if (this.message) { put(this.contentArea, "p", this.message) };
            if (this.detail) { put(this.contentArea, "p", this.detail) };
            
            this.technicalInfo = new CodeMirror({
                readonly: true,
                lineNumbers: true,
                autoHeight: true,
                lang: 'javascript',
                style: "display: none;",
                value: json.stringify(this.error, undefined, 2)
            }).placeAt(this.contentArea);

            new Button({
                label: i18n.gettext("OK"),
                class: "dijitButton--primary",
                onClick: lang.hitch(this, this.hide)
            }).placeAt(this.actionBar);

            if (settings['support_url']) {
                new Button({
                    label: i18n.gettext("Request support"),
                    class: "dijitButton--default",
                    style: "float: right;", 
                    onClick: function() {
                        var win = window.open(settings['support_url'], '_blank');
                        win.focus();
                    }
                }).placeAt(this.actionBar);
            };

            new Button({
                label: i18n.gettext("Technical information"),
                class: "dijitButton--default",
                style: "float: right; margin-right: 1ex;",
                onClick: lang.hitch(this, function () {
                    domStyle.set(this.technicalInfo.domNode, "display", "block");
                    this.technicalInfo.resize();
                    this.resize();
                })
            }).placeAt(this.actionBar);
        },

        startup: function () {
            this.inherited(arguments);
            this.technicalInfo.startup();
        }
    })
})