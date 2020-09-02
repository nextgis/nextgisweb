<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "ngw-webmap/SettingsForm",
            "dojo/domReady!"
        ], function (
            SettingsForm
        ) {
            (new SettingsForm()).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%;"></div>
