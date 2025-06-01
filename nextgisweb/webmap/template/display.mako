<%! from nextgisweb.gui.view import REACT_BOOT_JSENTRY %>

<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=entrypoint,
    name='DisplayLoader',
    props={'id': obj.id, 'title': title},
"/>

