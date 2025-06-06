<%!
    from types import SimpleNamespace
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>

<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%page args="obj, title, header, maxwidth, maxheight, breadcrumbs" />

<%def name="is_custom_layout()"><% return True %></%def>

<%
    dynmenu_kwargs = SimpleNamespace(request=request)
    if (dynmenu := context.get("dynmenu", UNDEFINED)) is UNDEFINED:
        if obj and (dynmenu := getattr(obj, "__dynmenu__", UNDEFINED)) is not UNDEFINED:
            dynmenu_kwargs.obj = obj

    base_props = dict(
        entrypoint = entrypoint,
        layoutMode = layout_mode if layout_mode is not UNDEFINED else None,
        entrypointProps = props if props is not UNDEFINED else {},
        title=tr(title),
        header=tr(header),
        maxwidth=None if maxwidth is UNDEFINED else maxwidth,
        maxheight=None if maxheight is UNDEFINED else maxheight,
        dynMenuItems=dynmenu.json(dynmenu_kwargs) if dynmenu is not UNDEFINED and dynmenu else None,
        breadcrumbs=breadcrumbs,
        hideResourceFilter=hide_resource_filter if hide_resource_filter is not UNDEFINED else None,
        hideMenu=hide_menu if hide_menu is not UNDEFINED else None,
    )
%>

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Base',
    props=base_props,
"/>
