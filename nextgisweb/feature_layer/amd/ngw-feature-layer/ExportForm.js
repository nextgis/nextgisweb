/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "ngw-pyramid/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/TextBox",
    "dojo/store/Memory",
    "dojo/data/ObjectStore",
    "dojo/request/xhr",
    "dojo/io-query",
    "ngw/settings!feature_layer",
    "ngw/route",
    "ngw-pyramid/i18n!feature_layer",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/ExportForm.hbs",
    // template
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dojox/layout/TableContainer",
    "dijit/form/Select",
    "dijit/form/CheckBox",
    "dijit/form/Button"
], function (
    declare,
    array,
    lang,
    Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    TextBox,
    Memory,
    ObjectStore,
    xhr,
    ioQuery,
    settings,
    route,
    i18n,
    hbsI18n,
    template
) {
    var SRS_URL = route.spatial_ref_sys.collection();

    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: hbsI18n(template, i18n),

        constructor: function (params) {
            declare.safeMixin(this, params);
            this.lco_widgets = [];
            this.dsco_widgets = [];
        },

        postCreate: function () {
            this.inherited(arguments);
            this.wFormat.watch('value', lang.hitch(this, function (attr, oldVal, newVal) {
                var format = this.formatStore.get(newVal);
                this.wZipped.set('disabled', !format.single_file);

                // TODO: add support for lco configuration

                // Remove existing dsco (Dataset Creation Option) widgets
                array.forEach(this.dsco_widgets, function (dscoWidget) {
                    // https://bugs.dojotoolkit.org/ticket/16935
                    this.wTableContainer.removeChild(dscoWidget);
                    dscoWidget.destroy();
                }, this);
                this.dsco_widgets = [];
                this.wTableContainer._children = [];

                // Create dsco widgets upon a driver change
                array.forEach(format.dsco_configurable, function (dsco) {
                    var dscoWidget = new TextBox({
                        label: dsco.split(":")[0],
                        value: dsco.split(":")[1],
                        style: "width: 100%"
                    });
                    this.dsco_widgets.push(dscoWidget);
                    this.wTableContainer.addChild(dscoWidget);
                }, this);
                this.wTableContainer.layout();
            }));

            this.buttonSave.on('click', lang.hitch(this, function () {
                var query = {
                    format: this.wFormat.get('value'),
                    srs: this.wSRS.get('value'),
                    zipped: this.wZipped.checked ? 'true' : 'false',
                    fid: this.wFID.get('value'),
                    encoding: this.wEncoding.get('value')
                };

                array.forEach(this.dsco_widgets, function (dscoWidget) {
                    query[dscoWidget.get('label')] = dscoWidget.get('value');
                });

                window.open(route.resource.export({
                    id: this.resid
                }) + '?' + ioQuery.objectToQuery(query));
            }));
        },

        startup: function () {
            this.inherited(arguments);

            this.formatStore = new ObjectStore(new Memory({
                data: array.map(settings.export_formats, function (format) {
                    return {
                        id: format.name,
                        label: format.display_name,
                        single_file: format.single_file,
                        lco_configurable: format.lco_configurable,
                        dsco_configurable: format.dsco_configurable
                    }
                })
            }));
            this.wFormat.set('store', this.formatStore);

            xhr.get(SRS_URL, {
                handleAs: 'json'
            }).then(lang.hitch(this, function (data) {
                this.wSRS.set('store', new ObjectStore(new Memory({
                    data: array.map(data, function (item) {
                        return {
                            id: item.id,
                            label: item.display_name
                        }
                    })
                })));
            }));
        }
    });
});