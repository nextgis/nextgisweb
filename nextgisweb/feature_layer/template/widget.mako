<%inherit file='nextgisweb:templates/obj.mako' />

<% import json %>

<script type="text/javascript">
    require([
        "dojo/dom",
        "ngw-feature-layer/FeatureEditorWidget",
        "dojo/domReady!"
    ], function (dom, FeatureEditorWidget) {
        var widget = new FeatureEditorWidget({
            resource: ${ obj.id | json.dumps, n },
            feature: ${ feature_id | json.dumps, n },
            fields: ${ fields | json.dumps, n },
            style: "width: 100%; height: 100%; padding: 1px;"});

        widget.placeAt(dom.byId("widget"));
        widget.startup();
        widget.load();
    });
</script>

<div id="widget" style="width: 100%; height: 100%; padding: 0;"></div>