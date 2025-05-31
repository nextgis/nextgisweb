<%page args="dynmenu, args"/>

<%
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>

<div id="dynmenu"></div>

<script type="text/javascript">
    Promise.all([
        ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then((m) => m.default),
        ngwEntry(${json_js(LAYOUT_JSENTRY)}),
    ]).then(([reactBoot, {Dynmenu}]) => {
        const props = ${json_js({"items": dynmenu.json(args)})};
        reactBoot(Dynmenu,  props, document.getElementById("dynmenu"));
    });
</script>