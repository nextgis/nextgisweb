<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <% import json %>
    <% current_image = request.route_url('pyramid.logo') if \
                       request.env.core.settings_exists('pyramid', 'logo') \
                       else '' %>
    <script type="text/javascript">
        require([
            "ngw-pyramid/LogoForm",
            "dojo/domReady!"
        ], function (
            LogoForm
        ) {
            new LogoForm({
                current_image: '${current_image}'
            }).placeAt('form').startup();
        });
    </script>
</%def>

<div id="form" style="width: 100%; height: 400px"></div>
