<%inherit file='nextgisweb:pyramid/template/base.mako' />

<script type="text/javascript">
    require([
        ${json_js(entrypoint)},
        "@nextgisweb/gui/react-app",
    ], function ({ default: comp }, { default: reactApp }) {
        var props = ${json_js(props if props else {})};
        const el = document.getElementById(comp.targetElementId || 'content')
        reactApp(comp, props, el);
    });
</script>