<%! from nextgisweb.pyramid.view import LAYOUT_JSENTRY %>

<%page args="header=None"/>
<% header = header if header else request.env.core.system_full_name() %>

<div id="header" class="ngw-pyramid-layout-header-stub"></div>
<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Header',
    props={'title': tr(header)},
    element='header',
"/>
