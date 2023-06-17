<div id="legendSymbols"></div>

<script type="text/javascript">
    require([
        "@nextgisweb/render/legend-symbols-widget",
        "@nextgisweb/gui/react-app",
    ], function (comp, reactApp) {
        reactApp.default(
            comp.default, {
                resourceId: ${obj.id},
            }, document.getElementById('legendSymbols')
        );
    });
</script>