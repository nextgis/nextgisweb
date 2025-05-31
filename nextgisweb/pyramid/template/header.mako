<%!
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>

<%page args="header=None"/>
<% header = header if header else request.env.core.system_full_name() %>

<div id="header" class="ngw-pyramid-layout-header-stub"></div>

<script type="text/javascript">
    Promise.all([
        ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then((m) => m.default),
        ngwEntry(${json_js(LAYOUT_JSENTRY)}),
    ]).then(([reactBoot, {Header}]) => {
        reactBoot(
            Header,
            {title: ${json_js(tr(header))}},
            document.getElementById("header"),
        );
    });
</script>
