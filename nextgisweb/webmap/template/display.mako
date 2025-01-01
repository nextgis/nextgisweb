<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%include file="nextgisweb:pyramid/template/header.mako" args="title=display_config['webmapTitle'],
    hide_resource_filter=True"/>

<div id="webmap-wrapper" class="webmap-wrapper">
    <div id="display" class="webmap-display" style="width: 100%; height: 100%">
    </div>
</div>

<script type="text/javascript">
    require([
        "@nextgisweb/webmap/display",
        "@nextgisweb/gui/react-app",
    ], function ({ default: comp }, { default: reactApp }) {
        const props = { config: ${json_js(display_config)} };
        const el = document.getElementById("display")
        reactApp(comp,props,el);
    });
</script>

