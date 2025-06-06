<%!

    from msgspec import NODEFAULT
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>


<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="is_custom_layout()"><% return True %></%def>


<%
    base_props = dict(
        title=tr(self.get_effective_title()),
        ## title="test",
        maxwidth=None if maxwidth is UNDEFINED else maxwidth,
        maxheight=None if maxheight is UNDEFINED else maxheight,
        breadcrumbs=[],
        ## dynMenuItems=[],
        ## breadcrumbs=bcpath,
    )
    dynmenu=self.get_dynmenu()
    dynmenu_kwargs=self.get_dynmenu_kwargs()

    if dynmenu is not UNDEFINED and dynmenu:
        base_props['dynMenuItems'] = dynmenu.json(dynmenu_kwargs)
    else:
        base_props['dynMenuItems'] = []
    base_props["entrypoint"] = entrypoint
    base_props["entrypointProps"] = props if props is not UNDEFINED else {}
    ## raise ValueError(base_props)
%>

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Base',
    props=base_props,
"/>




