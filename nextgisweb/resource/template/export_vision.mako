<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <script type="text/javascript">
        require([
            "ngw-resource/ExportVisionForm",
            "dojo/domReady!"
        ], function (
            ExportVisionForm
        ) {
            (new ExportVisionForm()).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%;"></div>

