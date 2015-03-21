<%inherit file='nextgisweb:templates/obj.mako' />

<% import json %>

<script type="text/javascript">
    require([
        "dojo/dom",
        "ngw-feature-layer/FeatureGrid",
        "dijit/form/Button",
        "dijit/form/TextBox",
        "dojo/domReady!"
    ], function (dom, FeatureGrid, Button, TextBox) {
        var grid = new FeatureGrid({layerId: ${obj.id}, style: "width: 100%; height: 100%; padding: 0"});
        grid.placeAt(dom.byId("grid"));
        grid.startup();
    });
</script>

<div id="grid" style="width: 100%; height: 100%; padding: 0;"></div>
