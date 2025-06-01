<%! from nextgisweb.gui.view import REACT_BOOT_JSENTRY %>

<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <style type="text/css">
        body, html {
            min-width: 0 !important; width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden;
        }
    </style>
</%def>

<div id="display" style="width: 100%; height: 100%"></div>
<%include file="nextgisweb:gui/template/react_boot.mako" args="
    jsentry=entrypoint,
    props={'id': obj.id, 'tinyConfig': {'mainDisplayUrl': request.route_url('webmap.display', id=obj.id) + '?' + request.query_string}},
    element='display',
"/>
