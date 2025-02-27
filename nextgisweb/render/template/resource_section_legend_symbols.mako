<%!
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.render.view import LEGEND_SYMBOLS_WIDGET_JSENTRY
%>

<div id="legendSymbols"></div>

<script type="text/javascript">
    ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then(({ default: reactBoot}) => {
        reactBoot(
            ${json_js(LEGEND_SYMBOLS_WIDGET_JSENTRY)},
            { resourceId: ${obj.id} },
            "legendSymbols"
        );
    });
</script>