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
    "ngw/settings!raster_layer",
    "ngw/route",
    "@nextgisweb/pyramid/i18n!",
    "dojo/text!./template/ExportForm.hbs",
    // template
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dojox/layout/TableContainer",
    "dijit/form/Select",
    "dijit/form/CheckBox",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/form/MultiSelect"
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
    template
) {
    var SRS_URL = route.spatial_ref_sys.collection();

    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        constructor: function (params) {
            declare.safeMixin(this, params);
        },

        postCreate: function () {
            this.inherited(arguments);
            this.wFormat.watch('value', lang.hitch(this, function (attr, oldVal, newVal) {
                var format = this.formatStore.get(newVal);
            }));
            this.buttonSave.on('click', lang.hitch(this, function () {
                var query = {
                    format: this.wFormat.get('value'),
                    srs: this.wSRS.get('value'),
                    bands: this.wBands.get('value')
                };
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
                        label: format.display_name
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

            // Multiselect Dojo widget is not associated with a data store/object.
            // As per the documentation it is just a wrapper over the SELECT HTML element.
            // As a result we need to use the basic HTML/JS code to add the OPTIONS for the widget.
            xhr.get(route.resource.item({id: this.resid}), {
                handleAs: 'json'
            }).then(lang.hitch(this, function (data) {
                array.forEach(data.raster_layer.color_interpretation, lang.hitch(this, function (item, idx) {
                    var opt = document.createElement("option");
                    opt.text = i18n.gettext("Band") + " " + (idx + 1) + (item !== "Undefined" ? " (" + item + ")" : "");
                    opt.value = idx + 1;
                    opt.selected = true;
                    this.wBands.domNode.options.add(opt)
                }));
            }));
        }
    });
});
