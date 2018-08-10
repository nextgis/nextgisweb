<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        require([
            "ngw-pyramid/HomePathForm",
            "dojo/domReady!"
        ], function (
            HomePathForm
        ) {
            (new HomePathForm()).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%;"></div>

