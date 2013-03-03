<%inherit file='../base.mako' />

<% from bunch import Bunch %>

<%include file="../dynmenu.mako" args="dynmenu=control_panel, args=Bunch(request=request)" />