<%inherit file='nextgisweb:pyramid/template/base.mako' />

<% system_name = request.env.core.system_full_name() %>

<div class="ngw-pyramid-layout">
    <%include
        file="nextgisweb:pyramid/template/header.mako"
        args="title=system_name, hide_resource_filter=True"
    />
    <div
        id="content"
        class="ngw-pyramid-layout-crow"
        style="justify-content: center; align-items: center; padding: 24px; background-color: #fafafa;"
    ></div>
</div>

<script type="text/javascript">
    Promise.all([
        ngwEntry("@nextgisweb/gui/react-app").then((m) => m.default),
        ngwEntry("@nextgisweb/gui/error"),
    ]).then(([reactApp, { ErrorPage }]) => {
        const props = ${json_js(dict(error=error_json))};
        reactApp(ErrorPage, props, document.getElementById('content'));
    });
</script>
