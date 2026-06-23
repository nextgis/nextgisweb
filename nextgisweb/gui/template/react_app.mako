<%!
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>

<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%page args="obj, title, header, maxwidth, maxheight, breadcrumbs" />

<%def name="is_custom_layout()"><% return True %></%def>

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Base',
    props=page_model,
"/>
