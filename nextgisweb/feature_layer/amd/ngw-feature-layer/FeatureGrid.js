/* globals ngwConfig */
define([
    "dojo/_base/declare",
    "dijit/layout/BorderContainer",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/ConfirmDialog",
    "dojo/text!./template/FeatureGrid.hbs",
    // dgrid & plugins
    "dgrid/OnDemandGrid",
    "dgrid/Selection",
    "dgrid/selector",
    "dgrid/extensions/ColumnHider",
    "dgrid/extensions/ColumnResizer",
    // other
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/request/xhr",
    "dojo/Deferred",
    "dojo/store/Observable",
    "dojo/dom-style",
    // ngw
    "ngw/route",
    "ngw-pyramid/i18n!feature_layer",
    "ngw-pyramid/hbs-i18n",
    "./FeatureStore",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + "dgrid/css/skins/claro.css",
    // template
    "dijit/layout/ContentPane",
    "dijit/Toolbar",
    "dijit/form/Button",
    "dijit/form/TextBox"
], function (
    declare,
    BorderContainer,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ConfirmDialog,
    template,
    // dgrid & plugins
    OnDemandGrid,
    Selection,
    selector,
    ColumnHider,
    ColumnResizer,
    // other
    lang,
    array,
    xhr,
    Deferred,
    Observable,
    domStyle,
    // ngw
    route,
    i18n,
    hbsI18n,
    FeatureStore
) {
    // Base class ggrid which is them wrapped in dijit widget
    var GridClass = declare([OnDemandGrid, Selection, ColumnHider, ColumnResizer, selector], {
        selectionMode: "none"
    });

    return declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        // Currently selected row
        selectedRow: null,

        // Show toolbar?
        showToolbar: true,

        // Show search string?
        likeSearch: true,

        constructor: function (params) {
            declare.safeMixin(this, params);

            this._gridInitialized = new Deferred();

            var widget = this;

            xhr.get(route.feature_layer.field({id: this.layerId}), {
                handleAs: "json"
            }).then(
                function (data) {
                    widget._fields = data;
                    widget.initializeGrid();
                }
            );

        },

        postCreate: function () {
            if (!this.showToolbar) {
                domStyle.set(this.toolbar.domNode, "display", "none");
            }

            this.watch("selectedRow", lang.hitch(this, function (attr, oldVal, newVal) {
                this.btnOpenFeature.set("disabled", newVal === null);
                this.btnUpdateFeature.set("disabled", newVal === null);
                this.btnDeleteFeature.set("disabled", newVal === null);
            }));

            this.btnOpenFeature.on("click", lang.hitch(this, this.openFeature));
            this.btnUpdateFeature.on("click", lang.hitch(this, this.updateFeature));
            this.btnDeleteFeature.on("click", lang.hitch(this, this.deleteFeature));

            if (this.likeSearch) {
                // Search is needed, set search string processors
                this.tbSearch.on("input", lang.hitch(this, function () {
                    if (this._timer !== undefined) { clearInterval(this._timer); }
                    this._timer = setInterval(lang.hitch(this, this.updateSearch), 750);
                }));

                this.tbSearch.watch("value", lang.hitch(this, function(attr, oldVal, newVal) {
                    this.updateSearch();
                }));
            } else {
                // Search is not needed, hide it
                domStyle.set(this.tbSearch.domNode, "display", "none");
            }
        },

        initializeGrid: function () {
            var columns = [
                selector({label: "", selectorType: "radio", width: 40, unhidable: true}),
                {
                    field: "id",
                    label: "#",
                    unhidable: true,
                    sortable: false
                }];

            var fields = [];

            array.forEach(this._fields, function (f) {
                columns.push({
                    field: "F:" + f.keyname,
                    label: f.display_name,
                    hidden: !f.grid_visibility
                });
                fields.push(f.keyname);
            });

            if (this.data === undefined) {
                this.store = new Observable(new FeatureStore({
                    layer: this.layerId,
                    fieldList: fields,
                    fieldPrefix: "F:"
                }));
            }

            this._grid = new GridClass({
                store: this.store ? this.store : undefined,
                columns: columns,
                queryOptions: this.queryOptions
            });

            if (this.data) {
                this._grid.renderArray(this.data);
            }

            domStyle.set(this._grid.domNode, "height", "100%");
            domStyle.set(this._grid.domNode, "border", "none");

            var widget = this;
            this._grid.on("dgrid-select", function (event) {
                widget.set("selectedRow", event.rows[0].data);
            });

            this._grid.on("dgrid-deselect", function () {
                widget.set("selectedRow", null);
            });

            this._gridInitialized.resolve();
        },

        startup: function () {
            this.inherited(arguments);

            var widget = this;
            this._gridInitialized.then(
                function () {
                    widget.gridPane.set("content", widget._grid.domNode);
                    widget._grid.startup();
                }
            );
        },

        openFeature: function() {
            window.open(route.feature_layer.feature.show({
                id: this.layerId,
                feature_id: this.get("selectedRow").id
            }));
        },

        updateFeature: function() {
            window.open(route.feature_layer.feature.update({
                id: this.layerId,
                feature_id: this.get("selectedRow").id
            }));
        },

        deleteFeature: function() {
            var widget = this;
            var fid = this.get("selectedRow").id;

            var confirmDlg = new ConfirmDialog({
                title: i18n.gettext("Confirmation"),
                content: i18n.gettext("Delete feature?"),
                style: "width: 300px"
            });

            confirmDlg.on("execute", lang.hitch(this, function() {
                xhr(route.feature_layer.feature.item({
                    id: this.layerId,
                    fid: fid}), {
                        method: "DELETE"
                    }
                ).then(function () { widget._grid.refresh(); });
            }));
            confirmDlg.show();
        },


        updateSearch: function () {
            if (this._timer !== undefined) { clearInterval(this._timer); }

            var value = this.tbSearch.get("value");
            if (this._search != value) {
                this._search = value;
                this._grid.set("query", {like: this.tbSearch.get("value")});
            }
        }

    });
});
