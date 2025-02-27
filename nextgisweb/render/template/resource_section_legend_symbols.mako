<div id="legendSymbols"></div>

<script type="text/javascript">
    Promise.all([
        ngwEntry("@nextgisweb/gui/react-app").then((m) => m.default),
        ngwEntry("@nextgisweb/render/legend-symbols-widget").then((m) => m.default),
    ]).then(([reactApp, comp]) => {
        reactApp(
            comp, {
                resourceId: ${obj.id},
            }, document.getElementById('legendSymbols')
        );
    });
</script>