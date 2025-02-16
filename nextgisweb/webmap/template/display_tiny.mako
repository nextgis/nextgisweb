<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <style type="text/css">
        body, html {
            min-width: 0 !important; width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden;
        }
        div.dijitTabPaneWrapper.dijitTabContainerTop-container.dijitAlignCenter {
            border: none;
        }
    </style>
</%def>

<div id="display" style="width: 100%; height: 100%"></div>

<script type="text/javascript">
    require([
        "@nextgisweb/webmap/display-tiny",
        "@nextgisweb/gui/react-app",
    ], function ({ default: comp }, { default: reactApp }) {
        const mainDisplayUrl = ${json_js(request.route_url('webmap.display', id=obj.id) + "?" + request.query_string)};
        const props = { id: ${json_js(id)}, tinyConfig: { mainDisplayUrl: mainDisplayUrl }};
        const el = document.getElementById("display")
        reactApp(comp, props, el);
    });
</script>
