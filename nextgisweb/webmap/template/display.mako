<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%include file="nextgisweb:pyramid/template/header.mako" args="title=title,
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
        const props = { id: ${json_js(id)} };
        const el = document.getElementById("display")
        reactApp(comp, props, el);
    });
</script>

