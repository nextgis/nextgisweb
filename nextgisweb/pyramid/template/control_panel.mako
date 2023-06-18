<%! from types import SimpleNamespace %>
<%inherit file='nextgisweb:pyramid/template/base.mako' />

<% kwargs = SimpleNamespace(request=request) %>
<%include file="dynmenu.mako" args="dynmenu=control_panel, args=kwargs" />