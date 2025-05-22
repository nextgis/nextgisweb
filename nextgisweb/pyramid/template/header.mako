<%!
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>

<%page args="title"/>

<div id="header"></div>

<script type="text/javascript">
    Promise.all([
        ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then((m) => m.default),
        ngwEntry(${json_js(LAYOUT_JSENTRY)}),
    ]).then(([reactBoot, {Header}]) => {
        reactBoot(Header, {title: ${json_js(title)}}, document.getElementById("header"));
    });
</script>
