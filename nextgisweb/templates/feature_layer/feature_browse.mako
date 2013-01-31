<%inherit file='../base.mako' />
<% import json %>

<%def name="head()">
    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>
</%def>

<script type="text/javascript">
    require([
        "dojo/dom",
        "feature_layer/FeatureGrid",
        "dijit/form/Button",
        "dojo/domReady!"
    ], function (dom, FeatureGrid, Button) {
        var grid = new FeatureGrid({layerId: ${obj.id}, style: "width: 100%; height: 100%; padding: 0"});
        grid.placeAt(dom.byId("grid"));

        var btn = new Button({
            label: "Открыть",
            iconClass: "dijitIconApplication",
            disabled: true,
            onClick: function () {
                window.location = grid.selectedRow.id + '/edit';
            }
        });

        grid.watch("selectedRow", function (attr, oldVal, newVal) {
            btn.set("disabled", newVal == null);
        });

        grid.toolbar.addChild(btn);

        grid.startup();
    });
</script>

<div id="grid" style="width: 100%; height: 100%; padding: 0;"></div>
