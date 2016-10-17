<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "ngw-pyramid/CORSForm",
            "dojo/domReady!"
        ], function (
            CORSForm
        ) {
            (new CORSForm()).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%; height: 400px"></div>
