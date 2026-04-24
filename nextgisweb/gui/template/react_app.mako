<%!
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
    from nextgisweb.resource import Resource
%>

<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%page args="obj, title, header, maxwidth, maxheight, breadcrumbs" />

<%def name="is_custom_layout()"><% return True %></%def>

<%
    dynmenu_resource_id = None

    if obj is not UNDEFINED and isinstance(obj, Resource):
        dynmenu_resource_id = obj.id

    base_props = dict(
        entrypoint = entrypoint,
        layoutMode = layout_mode if layout_mode is not UNDEFINED else None,
        entrypointProps = props if props is not UNDEFINED else {},
        title=tr(title),
        header=tr(header),
        maxwidth=None if maxwidth is UNDEFINED else maxwidth,
        maxheight=None if maxheight is UNDEFINED else maxheight,
        breadcrumbs=breadcrumbs,
        hideResourceFilter=hide_resource_filter if hide_resource_filter is not UNDEFINED else None,
        hideMenu=hide_menu if hide_menu is not UNDEFINED else None,
    )

    if dynmenu_resource_id is not None:
        base_props["dynMenuResourceId"] = dynmenu_resource_id
%>

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Base',
    props=base_props,
"/>