<%inherit file='nextgisweb:pyramid/template/base.mako' />

<script type="text/javascript">
    Promise.all([
        ngwEntry("@nextgisweb/gui/react-app").then((m) => m.default),
        ngwEntry(${json_js(entrypoint)}).then((m) => m.default),
    ]).then(([reactApp, comp]) => {
        var props = ${json_js(props if props else {})};
        const el = document.getElementById(comp.targetElementId || 'content');
        reactApp(comp, props, el);
    })
</script>