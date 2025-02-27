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
    ngwEntry("@nextgisweb/gui/react-boot").then(({ default: reactBoot}) => {
        reactBoot(
            "@nextgisweb/gui/error/entrypoint",
            ${json_js(dict(error=error_json))},
            "content",
            { name: "ErrorPage" }
        );
    });
</script>
