<%inherit file='../base.mako' />
<% import json %>

<%def name="head()">
    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>
</%def>

<script type="text/javascript">
    require(["dojo/parser"], function (parser) {
        parser.parse();
    });
</script>

<div data-dojo-id="grid"
    data-dojo-type="feature_layer/FeatureGrid"
    data-dojo-props="layerId: ${obj.id}"
    style="width: 100%; height: 100%; padding: 0;">

</div>
