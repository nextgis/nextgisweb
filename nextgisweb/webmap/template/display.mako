<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%include file="nextgisweb:pyramid/template/header.mako" args="title=title,
    hide_resource_filter=True"/>

<div id="webmap-wrapper" class="webmap-wrapper">
    <div id="display" class="webmap-display" style="width: 100%; height: 100%">
    </div>
</div>

<script type="text/javascript">
    Promise.all([
        ngwEntry("@nextgisweb/gui/react-app").then((m) => m.default),
        ngwEntry("@nextgisweb/webmap/display").then((m) => m.default),
    ]).then(([reactApp, comp]) => {
        const props = { id: ${json_js(id)} };
        const el = document.getElementById("display")
        reactApp(comp, props, el);
    });
</script>

