<%! from nextgisweb.gui.view import REACT_BOOT_JSENTRY %>

<%inherit file='nextgisweb:pyramid/template/base.mako' />

<div class="ngw-pyramid-layout">
    <%include file="nextgisweb:pyramid/template/header.mako"/>
    <div
        id="content"
        class="ngw-pyramid-layout-crow"
        style="justify-content: center; align-items: center; padding: 24px; background-color: #fafafa;"
    ></div>
</div>

<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=entrypoint,
    name='ErrorPage',
    props={'error': error_json},
    element='content',
"/>
