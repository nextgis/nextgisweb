<%page args="dynmenu, args"/>

<%
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
    from nextgisweb.lib import dynmenu as dm
    import json

    items = []
    label = None

    for item in dynmenu.build(args):
        if isinstance(item, dm.Label):
            label = {"type": "label", "label": request.translate(item.label)}
        elif isinstance(item, dm.Link):
            if label is not None:
                items.append(label)
                label = None
            url = item.url(args)
            items.append({
                "type": "link",
                "label": request.translate(item.label),
                "url": url,
                "target": item.target,
                "icon": item.icon,
                "icon_suffix": item.icon_suffix,
                "selected": url == request.url,
            })
%>

<div id="dynmenu"></div>

<script type="text/javascript">
    Promise.all([
        ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then((m) => m.default),
        ngwEntry(${json_js(LAYOUT_JSENTRY)}),
    ]).then(([reactBoot, {Dynmenu}]) => {

         const props = ${json.dumps({"items": items}) | n};
        reactBoot(Dynmenu,  props, document.getElementById("dynmenu"));
    });
</script>