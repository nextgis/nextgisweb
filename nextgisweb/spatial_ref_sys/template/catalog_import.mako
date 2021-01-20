<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "ngw-spatial-ref-sys/CatalogImportForm",
            "dojo/domReady!"
        ], function (
            CatalogImportForm
        ) {
            (new CatalogImportForm({catalog_id: ${catalog_id}})).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%;"></div>
