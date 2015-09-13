<%inherit file='nextgisweb:templates/base.mako' />

<% from bunch import Bunch; kwargs = Bunch(request=request) %>
<%include file="nextgisweb:templates/dynmenu.mako" args="dynmenu=control_panel, args=kwargs" />