<%inherit file='nextgisweb:pyramid/template/base.mako' />

<script type="text/javascript">
    require([
        ${json_js(entrypoint)},
        "@nextgisweb/gui/react-app",
    ], function (comp, reactApp) {
        var props = ${json_js(props if props else {})};

        reactApp.default(
            comp.default, props,
            document.getElementById('content')
        );
    });
</script>