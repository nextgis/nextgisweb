<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%!
    from nextgisweb.pyramid.util import _
    from nextgisweb.pyramid.exception import json_error
%>

<%def name="title()">
    ${tr(error_title)}
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
        '@nextgisweb/gui/error',
        "@nextgisweb/gui/react-app",
    ], function (errorModule, reactApp) {
        var props = ${json_js(dict(error=error_json))};
        reactApp.default(
            errorModule.ErrorPage, props,
            document.getElementById('root')
        );
    });
</script>
