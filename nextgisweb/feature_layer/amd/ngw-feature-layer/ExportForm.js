/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "ngw-pyramid/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/store/Memory",
    "dojo/data/ObjectStore",
    "dojo/request/xhr",
    "dojo/io-query",
    "ngw/settings!feature_layer",
    "ngw/route",
    "ngw-pyramid/i18n!pyramid",
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
        },

        postCreate: function () {
            this.inherited(arguments);
            this.buttonSave.on('click', lang.hitch(this, function () {
                var query = {
                    format: this.wFormat.get('value'),
                    srs: this.wSRS.get('value'),
                    zipped: this.wZipped.checked ? 'true' : 'false'
                };
                window.open(route.feature_layer.export({
                    id: this.resid
                }) + '?' + ioQuery.objectToQuery(query));
            }));
        },

        startup: function () {
            this.inherited(arguments);

            var formatMap = settings.export_formats;
            this.wFormat.set('store', new ObjectStore(new Memory({
                data: array.map(Object.keys(formatMap), function (key) {
                    return {
                        id: formatMap[key],
                        label: key
                    }
                })
            })));

            xhr.get(SRS_URL, {
                handleAs: 'json'
            }).then(lang.hitch(this, function (data) {
                this.wSRS.set('store', new ObjectStore(new Memory({
                    data: array.map(data, function (item) {
                        return {
                            id: item.auth_srid,
                            label: item.display_name
                        }
                    })
                })));
            }));
        }
    });
});