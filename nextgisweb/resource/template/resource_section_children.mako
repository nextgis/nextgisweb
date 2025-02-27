<%!
    from types import SimpleNamespace
    from nextgisweb.lib import dynmenu as dm
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.resource import ResourceScope
    from nextgisweb.resource.view import CHILDREN_SECTION_JSENTRY
%>

<%page args="section" />
<% section.content_box = False %>

<div id="childrenSection" class="ngw-resource-section ngw-card"></div>

<%
    resources = [res for res in obj.children if (ResourceScope.read in res.permissions(request.user))]
    resources.sort(key=lambda res: (res.cls_order, res.display_name))

    data = list()
    for item in resources:
        idata = dict(
            id=item.id, displayName=item.display_name, link=request.route_url('resource.show', id=item.id),
            cls=item.cls, clsDisplayName=tr(item.cls_display_name), creationDate=item.creation_date,
            ownerUserDisplayName=tr(item.owner_user.display_name_i18n))
        
        iacts = idata["actions"] = list()
        args = SimpleNamespace(obj=item, request=request)
        for menu_item in item.__dynmenu__.build(args):
            if isinstance(menu_item, dm.Link) and menu_item.important and menu_item.icon is not None:
                iacts.append(dict(
                    href=menu_item.url(args), target=menu_item.target,
                    title=tr(menu_item.label), icon=menu_item.icon, key=menu_item.key))

        data.append(idata)
%>

<script type="text/javascript">
    ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then(({ default: reactBoot}) => {
        reactBoot(
            ${json_js(CHILDREN_SECTION_JSENTRY)},
            {
                storageEnabled: ${json_js(request.env.core.options['storage.enabled'])},
                data: ${json_js(data)},
                resourceId: ${obj.id},
            },
            "childrenSection"
        );
    });
</script>