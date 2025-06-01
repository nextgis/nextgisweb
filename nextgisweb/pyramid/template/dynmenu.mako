<%! from nextgisweb.pyramid.view import LAYOUT_JSENTRY %>

<%page args="dynmenu, args"/>

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=LAYOUT_JSENTRY,
    name='Dynmenu',
    props={'items': dynmenu.json(args)},
"/>