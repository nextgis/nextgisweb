<%!
    from bunch import Bunch
    from nextgisweb import dynmenu as dm
    from nextgisweb.resource.scope import ResourceScope
%>

<div id="childrenSection"></div>

<%
    data = list()
    for item in obj.children:
        if ResourceScope.read not in item.permissions(request.user):
            continue
        idata = dict(
            id=item.id, displayName=item.display_name, link=item.permalink(request),
            cls=item.cls, clsDisplayName=tr(item.cls_display_name),
            ownerUserDisplayName=item.owner_user.display_name)
        
        iacts = idata["actions"] = list()
        args = Bunch(obj=item, request=request)
        for menu_item in item.__dynmenu__.build(args):
            if isinstance(menu_item, dm.Link) and menu_item.important and menu_item.icon is not None:
                iacts.append(dict(
                    href=menu_item.url(args), target=menu_item.target,
                    title=tr(menu_item.label), icon=menu_item.icon, key=menu_item.key))

        data.append(idata)

    data.sort(key=lambda x: (0 if x['cls'] == 'resource_group' else (1 if x['cls'] == 'webmap' else 2), x['displayName']))
%>

<script type="text/javascript">
    require([
        "@nextgisweb/resource/children-section",
        "@nextgisweb/gui/react-app",
    ], function (comp, reactApp) {
        reactApp.default(
            comp.default, {
                storageEnabled: ${json_js(request.env.core.options['storage.enabled'])},
                data: ${json_js(data)},
                resourceId: ${obj.id},
            }, document.getElementById('childrenSection')
        );
    });
</script>