<%inherit file='nextgisweb:pyramid/template/obj.mako' />

<script type="text/javascript">
    require([
        "dojo/dom",
        "ngw-feature-layer/FeatureEditorWidget",
        "dojo/domReady!"
    ], function (dom, FeatureEditorWidget) {
        var widget = new FeatureEditorWidget({
            resource: ${json_js(obj.id)},
            feature: ${json_js(feature_id)},
            fields: ${json_js(fields)},
            style: "width: 100%; height: 100%; padding: 1px;"});

        widget.placeAt(dom.byId("widget"));
        widget.startup();
        widget.load();
    });
</script>

<div id="widget" style="width: 100%; height: 100%; padding: 0;"></div>