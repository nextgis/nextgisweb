<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%! from nextgisweb.auth.util import _ %>

<%def name="title()">
    ${tr(_('Sign in to Web GIS'))}
</%def>

<% system_name = request.env.core.system_full_name() %>

<%include
    file="nextgisweb:pyramid/template/header.mako"
    args="title=system_name, hide_resource_filter=True"
/>

<div style="position: absolute; top: 100px; bottom: 100px; right: 0px;  width: 100%">
    <div style="display: flex; justify-content: center; align-items: center; height: 100%">
        <div id="root"></div>
    <div>
</div>

<script type="text/javascript">
    require([
        '@nextgisweb/auth/login-box',
        "@nextgisweb/gui/react-app",
    ], function (loginFormModule, reactApp) {
        reactApp.default(
            loginFormModule.default, {},
            document.getElementById('root')
        );
    });
</script>
