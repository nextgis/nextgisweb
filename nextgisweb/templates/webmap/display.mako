<%inherit file='../base.mako' />


<%def name="assets()">
    <script type="text/javascript" src="${request.static_url('nextgisweb:static/openlayers/OpenLayers.js')}"></script>
</%def>

<%def name="layer_group_js(item)">
    %for subgroup in item.children:
        ${layer_group_js(subgroup)}
    %endfor

    %for layer in item.layers:
        %if len(layer.styles) > 0:
            ${layer_js(layer)}
        %endif
    %endfor
</%def>

<%def name="layer_js(item)">
    <% import json %>
    var layer = new OpenLayers.Layer.OSM(
        ${item.display_name | json.dumps, n},
        ${request.route_url('style.tms', id=item.styles[0].id) + '?z=${z}&x=${x}&y=${y}' | json.dumps, n},
        {isBaseLayer: false, type: 'png', visibility: false}
    );

    layers[${item.id | json.dumps, n}] = layer;

    dojoMap.olMap.addLayers([layer]);
</%def>

<%def name="head()">
    <% import json %>
    <script type="text/javascript">
        var layerConfig = ${layer_config | json.dumps, n};
        var treeConfig = ${tree_config | json.dumps, n};

        var dojoMap;
        var adapters = {};
        var layers = {};

        var treeStore;
        var treeModel;

        require([
            "dojo/_base/array",
            "dojo/parser",
            "dojo/ready",
            "dojo/data/ItemFileWriteStore",
            "cbtree/models/TreeStoreModel",
            "dojox/geo/openlayers/Map",
            // чтобы не заморачиваться с асинхронной загрузкой адаптеров
            // генерим js код, который загрузит их разом
            ${', '.join([ json.dumps(v) for k, v in adapters]) | n}
        ], function (
            array,
            parser,
            ready,
            ItemFileWriteStore,
            TreeStoreModel,
            Map,
            ${', '.join([ "adapter_%s" % k for k, v in adapters]) }
        ) {
            // перенос адаптеров в переменную adapters
            ${';\n'.join([ ("adapters.%s = adapter_%s") % (k, k) for k, v in adapters]) | n} ;

            parser.parse();

            treeStore = new ItemFileWriteStore({
                data: { 
                    label: "display_name",
                    items: [ treeConfig ]
                }
            });

            treeModel = new TreeStoreModel({
                store: treeStore,
                query: {item_type: 'root'},
                checkedAll: false
            });

            array.forEach(layerConfig, function (l) {
                layers[l.id] = new adapters.tms(l);
            });

            ready(function() {
                dojoMap = new Map("map");
                array.forEach(layerConfig, function(l) {
                    dojoMap.olMap.addLayer(layers[l.id].olLayer);
                });
            });
        });

        require(
            ['dojo/parser', 'dojo/domReady', 'dojo/data/ItemFileWriteStore', 'cbtree/Tree', "dijit/tree/dndSource", 'cbtree/models/ForestStoreModel', 'dojo/_base/connect'],
            function (parser, domReady, ItemFileWriteStore, Tree, dndSource, ForestStoreModel, connect) {
                var tree = new Tree({model: treeModel, autoExpand: true, showRoot: false, branchReadOnly: true, dndController: dndSource});
                connect.connect(tree, "onCheckBoxClick", treeModel, function (item, nodeWidget, evt) {
                    layers[item.id].olLayer.setVisibility(nodeWidget.get("checked"));
                });

                domReady(function () {
                    tree.placeAt('layer_tree');
                });
            })

        function toggleLayer(id, visibility) {
            layers[id].setVisibility(visibility);
        };
    </script>

    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>
</%def>

    <div id="11" data-dojo-type="dijit/layout/BorderContainer" style="height: 100%">
        <div data-dojo-type="dijit/Toolbar" data-dojo-props="region: 'top'">
            <div data-dojo-type="dijit/form/Button">Идентификация</div>
        </div>
        <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region: 'left', splitter: true" style="width: 250px; padding: 0;" id="layer_tree"></div>
        <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region: 'center'" style="padding: 0;">
            <div style="width: 100%; height: 100%;" id="map"></div>
        </div>
    </div>

