define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/when",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/form/Button",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/i18n!",
    "xstyle/css!./resource/CompositeWidget.css"
], function (
    declare,
    lang,
    array,
    Deferred,
    all,
    when,
    domClass,
    domStyle,
    Button,
    BorderContainer,
    ContentPane,
    TabContainer,
    ErrorDialog,
    api,
    i18n
) {
    var CompositeWidget = declare("ngw.resource.CompositeWidget", BorderContainer, {
        style: "width: 100%; height: 100%; padding: 1px;",
        gutters: false,

        buildRendering: function () {
            this.inherited(arguments);

            this.tabContainer = new TabContainer({
                region: "center"
            }).placeAt(this);

            this.lockContainer = new ContentPane({
                region: "center",
                style: "display: none; border: 1px solid silver; background-color: #fff",
                content: i18n.gettext("Please wait. Processing request...")
            }).placeAt(this);

            this.btnContainer = new ContentPane({
                region: "bottom"
            }).placeAt(this);

            domClass.add(this.btnContainer.domNode, "ngwButtonStrip");

            this.members = [];

            for (var k in this.config) {
                var membercls = this.config[k].cls;
                var member = new membercls({composite: this});

                member.placeAt(this.tabContainer);
                this.members.push(member);
            }

            this.buttons = [];

            if (this.operation === "create") {

                this.buttons.push(new Button({
                    label: i18n.gettext("Create"),
                    onClick: lang.hitch(this, function () { this.createObj(false); })
                }).placeAt(this.btnContainer));

                this.buttons.push(new Button({
                    label: i18n.gettext("Create and edit"),
                    onClick: lang.hitch(this, function () { this.createObj(true); })
                }).placeAt(this.btnContainer));

            } else if (this.operation === "update") {

                this.buttons.push(new Button({
                    label: i18n.gettext("Save"),
                    onClick: lang.hitch(this, this.updateObj)
                }).placeAt(this.btnContainer));

            } else if (this.operation === "delete") {

                this.buttons.push(new Button({
                    label: i18n.gettext("Delete"),
                    onClick: lang.hitch(this, this.deleteObj)
                }).placeAt(this.btnContainer));

            }

            if (this.operation === "read" || this.operation === "update") {

                // Turn off Refresh button, as currently this will not work
                // correctly with the following widgets:
                // PermissionWidget, FieldsWidget, ItemWidget.
                // Update widget state (with the page) with F5.

                // this.buttons.push(new Button({
                //     label: "Обновить",
                //     iconClass: "dijitIconConnector",
                //     onClick: lang.hitch(this, this.refreshObj)
                // }).placeAt(this.btnContainer));

            }

            array.forEach(this.buttons, function (btn) {
                domClass.add(btn.domNode, "dijitButton--primary");
            });

        },

        startup: function () {
            this.inherited(arguments);

            if (this.operation === "read" || this.operation === "update") {
                this.refreshObj();
            }
        },

        // Serialization and validation
        // ============================

        validateData: function () {
            var deferred = new Deferred(),
                promises = [],
                errors = [];

            // Register error, this function is given to
            // children widgets as a parameter
            function errback(err) {
                errors.push(err);
            }

            array.forEach(this.members, function (member) {
                // Validation can be asynchronous,
                // member.validate will return deferred in this case, collect them into an array
                promises.push(when(member.validateData(errback)).then(
                    function /* callback */ (success) {
                        // If validation returned an error
                        // mark a heading red\

                        if (!success) {
                            domClass.add(member.controlButton.domNode, "dijitTabError");
                        } else {
                             if(domClass.contains(member.controlButton.domNode, "dijitTabError"))
                                domClass.remove(member.controlButton.domNode, "dijitTabError");
                        }
                        return success;
                    }
                ));
            });

            all(promises).then(
                function /* callback */ (results) {
                    var success = true;

                    // Check results of all members,
                    // all must return True
                    array.forEach(results, function (res) {
                        success = success && res;
                    });

                    // As children widgets, composit widget
                    // returns True or False and reject if there is an error.
                    deferred.resolve(success);
                },

                function /* errback */ (err) {
                    deferred.reject(err);
                }

            ).then(null, deferred.reject);

            return deferred;
        },

        serialize: function () {
            var promises = [];
            var data = { resource: {} };

            if (this.operation === "create") {
                data.resource.cls = this.cls;
                data.resource.parent = { id: this.parent };
            }

            array.forEach(this.members, function (member) {
                promises.push(when(member.serialize(data)));
            });

            return all(promises).then(function () {
                return data;
            });
        },

        deserialize: function (data) {
            for (var k in this.members) {
                this.members[k].deserialize(data);
            }
        },

        // REST API
        // ========

        storeRequest: function (args) {
            var widget = this,
                deferred = new Deferred();

            this.validateData().then(
                function /* callback */ (success) {
                    if (success) {
                        console.debug("Validation completed with success");
                        widget.serialize().then(
                            function /* callback */ (data) {
                                console.debug("Serialization completed");
                                api.request(args.url, {
                                    method: args.method,
                                    json: data,
                                }).then(
                                    function /* callback */ (response) {
                                        console.debug("REST API request completed");
                                        deferred.resolve(response);
                                    },
                                    function /* errback */ (err) {
                                        console.error("REST API request failed");
                                        deferred.reject(err);
                                    }
                                );
                            },
                            function /* errback */ () {
                                console.error("Serialization failed");
                                deferred.reject({
                                    title: i18n.gettext("Unexpected error"),
                                    message: i18n.gettext("Serialization failed")
                                });
                            }
                        );
                    } else {
                        console.debug("Validation completed without success");
                        deferred.reject({
                            title: i18n.gettext("Validation error"),
                            message: i18n.gettext("Errors found during data validation. Tabs with errors marked in red.")
                        });
                    }
                },
                function /* errback */ () {
                    console.error("Validation failed");
                    deferred.reject({
                        title: i18n.gettext("Unexpected error"),
                        message: i18n.gettext("Validation failed")
                    });
                }
            );

            return deferred;
        },


        // Different actions and buttons
        // =============================

        lock: function () {
            domStyle.set(this.tabContainer.domNode, "display", "none");
            domStyle.set(this.lockContainer.domNode, "display", "block");
            array.forEach(this.buttons, function (btn) { btn.set("disabled", true) });
        },

        unlock: function (err) {
            domStyle.set(this.lockContainer.domNode, "display", "none");
            domStyle.set(this.tabContainer.domNode, "display", "block");
            array.forEach(this.buttons, function (btn) { btn.set("disabled", false) });

            this.tabContainer.resize();

            if (err !== undefined) {
                new ErrorDialog(err).show();
            }
        },

        createObj: function (edit) {
            this.lock();

            this.storeRequest({
                url: api.routeURL('resource.collection'),
                method: "POST",
            }).then(
                /* callback */ lang.hitch(this, function (data) {
                    if (edit) {
                        window.location = api.routeURL('resource.update', {id: data.id});
                    } else {
                        window.location = api.routeURL('resource.show', {id: data.id});
                    }
                }),
                /* errback  */ lang.hitch(this, this.unlock)
            );
        },

        updateObj: function () {
            this.lock();

            this.storeRequest({
                url: api.routeURL('resource.item', {id: this.id}),
                method: "PUT"
            }).then(
                /* callback */ lang.hitch(this, function () {
                    window.location = api.routeURL('resource.show', {id: this.id});
                }),
                /* errback  */ lang.hitch(this, this.unlock)
            );
        },

        deleteObj: function () {
            this.lock();

            this.storeRequest({
                url: api.routeURL('resource.item', {id: this.id}),
                method: "DELETE"
            }).then(
                /* callback */ lang.hitch(this, function () {
                    window.location = api.routeURL('resource.show', {id: this.parent});
                    this.unlock();
                }),
                /* errback  */ lang.hitch(this, this.unlock)
            );
        },

        refreshObj: function () {
            api.route('resource.item', {
                id: this.id
            }).get().then(
                lang.hitch(this, this.deserialize)
            );
        },
    });

    CompositeWidget.bootstrap = function (options) {
        var deferred = new Deferred();

        var amdmod = [];
        for (var i in options.config) { amdmod.push(i); }
        require(amdmod, function () {
            for (var i = 0; i < amdmod.length; i++) {
                var cls = arguments[i];
                options.config[amdmod[i]].cls = cls;
            }
            deferred.resolve(new CompositeWidget(options));
        });

        return deferred;
    };

    return CompositeWidget;
});
