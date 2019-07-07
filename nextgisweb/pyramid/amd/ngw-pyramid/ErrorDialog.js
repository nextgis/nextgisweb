define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-style",
    "dojo/json",
    "dijit/Dialog",
    "dijit/form/Button",
    "put-selector/put",
    "ngw-pyramid/form/CodeMirror",
    "ngw-pyramid/i18n!resource",
], function (
    declare, 
    lang,
    domStyle,
    json,
    Dialog,
    Button,
    put,
    CodeMirror,
    i18n
) {
    return declare([Dialog], {
        title: "Error",

        constructor: function (options) {
            this.inherited(arguments);
            this.error = options.error;
        },

        buildRendering: function () {
            this.inherited(arguments);
            this.set('title', this.error.title);

            this.contentArea = put(this.containerNode, 'div.dijitDialogPaneContentArea[style=max-width: 40em]');
            this.actionBar = put(this.containerNode, 'div.dijitDialogPaneActionBar[style=text-align: left; padding: 1ex]');

            if (this.error.message) { put(this.contentArea, "p", this.error.message) };
            if (this.error.detail) { put(this.contentArea, "p", this.error.detail) };
            
            this.technicalInfo = new CodeMirror({
                readonly: true,
                lineNumbers: true,
                lang: 'javascript',
                style: "display: none;",
                value: json.stringify(this.error, undefined, 2)
            }).placeAt(this.contentArea);

            new Button({
                label: i18n.gettext("OK"),
                class: "dijitButton--primary",
                style: "margin-right: 1ex",
                onClick: lang.hitch(this, this.hide)
            }).placeAt(this.actionBar);

            new Button({
                label: i18n.gettext("Report a bug"),
                class: "dijitButton--default"
            }).placeAt(this.actionBar);
            
            new Button({
                label: i18n.gettext("Technical information"),
                class: "dijitButton--default",
                style: "float: right",
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