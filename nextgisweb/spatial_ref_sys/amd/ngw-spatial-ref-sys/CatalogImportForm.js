define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/request/xhr",
    "dojo/json",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/pyramid/i18n!",
    "dojo/text!./template/CatalogImportForm.hbs",
    // template
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dojox/layout/TableContainer",
    "dijit/form/TextBox",
    "dijit/form/SimpleTextarea"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    xhr,
    json,
    route,
    ErrorDialog,
    i18n,
    template
) {
    var catalog_item = route.spatial_ref_sys.catalog.item;
    var srs_edit = route.srs.edit;
    var catalog_import_url = route.spatial_ref_sys.catalog.import();

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),

        postCreate: function () {
            this.inherited(arguments);
            this.buttonImport.on("click", this.import.bind(this));
        },

        startup: function () {
            this.inherited(arguments);
            xhr.get(catalog_item({
                id: this.catalog_id
            }), {handleAs: 'json'}
            ).then(function (data) {
                this.wDisplayName.set('value', data.display_name);
                this.wWKT.set('value', data.wkt);
            }.bind(this));
        },

        import: function () {
            var data = {catalog_id: this.catalog_id};
            xhr.post(catalog_import_url, {
                handleAs: 'json',
                headers: {
                    "Content-Type": "application/json"
                },
                data: json.stringify(data)
            }).then(function (data) {
                window.location = srs_edit({id: data.id});
            }, ErrorDialog.xhrError);
        }
    });
});
