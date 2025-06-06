<%! from nextgisweb.pyramid.view import LAYOUT_JSENTRY %>

<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%page args="effective_title, maxwidth, maxheight, dynmenu, dynmenu_kwargs, breadcrumbs" />

<%def name="is_custom_layout()"><% return True %></%def>

<%
    base_props = dict(
        entrypoint = entrypoint,
        entrypointProps = props if props is not UNDEFINED else {},
        title=tr(effective_title),
        maxwidth=None if maxwidth is UNDEFINED else maxwidth,
        maxheight=None if maxheight is UNDEFINED else maxheight,
        dynMenuItems=dynmenu.json(dynmenu_kwargs) if dynmenu is not UNDEFINED and dynmenu else None,
        breadcrumbs=breadcrumbs,
    )
%>

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Base',
    props=base_props,
"/>
