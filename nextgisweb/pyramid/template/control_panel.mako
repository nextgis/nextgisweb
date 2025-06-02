<%!
    from types import SimpleNamespace
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>

<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Dynmenu',
    props={'items': control_panel.json(SimpleNamespace(request=request))},
"/>
