<%inherit file='../base.mako' />


<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        var layerConfig = ${ json.dumps(layer_config, indent=4) | n};
        var treeConfig = ${tree_config | json.dumps, n};
        var adapterClasses = {};
    </script>

    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>

    <script type="text/javascript">
        <% import json %>
        require([
            "dojo/parser",
            ${', '.join([ json.dumps(v) for k, v in adapters]) | n}
        ], function (
            parser,
            ${', '.join([ "adapter_%s" % k for k, v in adapters]) }
        ) {
            ${';\n'.join([ ("adapterClasses.%s = adapter_%s") % (k, k) for k, v in adapters]) | n} ;
            parser.parse();
        });
    </script>

</%def>


<div data-dojo-id="display"
    data-dojo-type="webmap/Display"
    data-dojo-props="treeConfig: treeConfig, layerConfig: layerConfig, adapterClasses: adapterClasses"
    style="width: 100%; height: 100%">
</div>

