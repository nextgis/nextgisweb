define([
    "dojo/_base/declare",
    "dojo/Deferred",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/when",
    "dojo/dom-construct",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "ngw-pyramid/i18n!pyramid"
], function (
    declare,
    Deferred,
    xhr,
    json,
    when,
    domConstruct,
    ContentPane,
    Button,
    i18n
) {
    // Mixin that turns ngw-pyramid/modelWidget/Widget in model editing form
    // with buttons and functionality to save 
    // or add.

    return declare([], {

        constructor: function (params) {
            this.buttonPane = new ContentPane({style: "padding: 12px 0 4px;"});
            this.submitUrl = params.url;

            widget = this;

            if (params.operation == 'create') {
                this.btn = new Button({label: i18n.gettext("Create"), class: "dijitButton--primary" });
            } else if (params.operation == 'edit') {
                this.btn = new Button({label: i18n.gettext("Save"), class: "dijitButton--primary"});
            } else if (params.operation == 'delete') {
                this.btn = new Button({label: i18n.gettext("Delete"), class: "dijitButton--primary"});
            }

            this.btn.placeAt(this.buttonPane).on("click", function () { widget.submit(); });
        },

        postCreate: function () { 
            // Create additional div, where children
            // widgets will be stored
            this.containerNode = domConstruct.create('div', null, this.domNode);

            // Call base class after, in case someone want to 
            // add a child widget as well
            this.inherited(arguments);
        },

        addChild: function (child) {
            if (child == this.buttonPane) {
                // Add toolbar with buttons to root
                child.placeAt(this.domNode);
            } else {
                // Add other stuff to special container
                child.placeAt(this.containerNode);
            }
        },

        startup: function () {
            this.inherited(arguments);
            this.buttonPane.placeAt(this);
        },

        submit: function () {
            var widget = this;

            // block form just in case
            this.set("disabled", true);

            var validate = function () { return { isValid: true, error: [] }; };
            if (this.validateWidget) {
                validate = function () { return widget.validateWidget(); };
            }

            var d = new Deferred();

            // unblock form in any case
            d.then(
                function (success) { if (!success) { widget.set("disabled", false); } },
                function (errinfo) {
                    console.log(errinfo);
                    alert(i18n.gettext("Unexpected error occurred during the operation."));
                    widget.set("disabled", false);
                }
            );

            // form validation can be asynchronous
            when(validate(),
                function (result) {
                    if (result.isValid) {
                        // getting value can be asynchronous
                        when(widget.get("value"),
                            function (value) {
                                // IE checking
                                if (document.documentMode) {
                                    // #612 IE will raise 'Syntax error' if url empty
                                    if (!widget.submitUrl || 0 === widget.submitUrl.length) {
                                        widget.submitUrl = window.location.href;
                                    }
                                }
                                xhr.post(widget.submitUrl, {
                                    handleAs: "json",
                                    data: json.stringify(value),
                                    headers: { "Content-Type": "application/json" }
                                }).then(
                                    function (response) {
                                        if (response.status_code == 200) {
                                            d.resolve(true);
                                            window.location = response.redirect;
                                        } else if (response.status_code == 400) {
                                            d.resolve(false);
                                            widget.set("error", response.error);
                                        } else {
                                            // something wrong with the response
                                            d.reject();
                                        }
                                    },
                                    d.reject
                                );
                            }, d.reject
                        );
                    } else {
                        widget.set("error", result.error);
                        d.resolve(false);
                    }
                }, d.reject
            );

            return d;
        },

        _setDisabledAttr: function (value) {
            this.inherited(arguments);
            this.btn.set('disabled', value);
        }
    });
});
