<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "ngw-pyramid/MiscellaneousForm",
            "dojo/domReady!"
        ], function (
            MiscellaneousForm
        ) {
            (new MiscellaneousForm()).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%;"></div>
