define([
    'dojo/_base/declare',
    "dijit/layout/BorderContainer",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/FeatureGrid.html",
    // dgrid & plugins
    'dgrid/OnDemandGrid',
    'dgrid/Selection',
    // other
    'dojo/_base/array',
    'dojo/request/xhr',
    'dojo/Deferred',
    'dojo/promise/all',
    'dojo/store/JsonRest',
    'dojo/store/Observable',
    'dojo/dom-style',
    // template
    "dijit/layout/ContentPane",
    "dijit/Toolbar"
], function (
    declare,
    BorderContainer,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    // dgrid & plugins
    OnDemandGrid,
    Selection,
    // other
    array,
    xhr,
    Deferred,
    all,
    JsonRest,
    Observable,
    domStyle
) {
    // Базовый класс ggrid над которым затем делается обертка в dijit виджет
    var GridClass = declare([OnDemandGrid, Selection], {
        selectionMode: "single"
    });

    return declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        constructor: function (params) {
            declare.safeMixin(this, params);

            this._store = new Observable(new JsonRest({
                target: application_url + '/layer/' + this.layerId + '/store_api'
            }));

            this._gridInitialized = new Deferred();

            var widget = this;
            xhr.get(application_url + '/layer/' + this.layerId + '/field/', {
                handleAs: 'json'
            }).then(
                function (data) {
                    widget._fields = data;
                    widget.initializeGrid();
                }
            );
        },

        initializeGrid: function () {
            var columns = [{
                field: "id",
                label: "#"
            }];
            array.forEach(this._fields, function (f) {
                columns.push({
                    field: f.keyname,
                    label: f.keyname
                });
            });

            this._grid = new GridClass({
                store: this._store,
                columns: columns
            });

            domStyle.set(this._grid.domNode, "height", "100%");
            domStyle.set(this._grid.domNode, "border", "none");

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
        }
    })
});