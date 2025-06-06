<%! from nextgisweb.pyramid.view import LAYOUT_JSENTRY %>

<%page args="header"/>

<div id="header" class="ngw-pyramid-layout-header-stub"></div>
<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Header',
    props={'header': tr(header)},
    element='header',
"/>
