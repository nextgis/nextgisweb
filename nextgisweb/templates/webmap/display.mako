<%inherit file='../base.mako' />


<%def name="assets()">
    <script type="text/javascript" src="${request.static_url('nextgisweb:static/openlayers/OpenLayers.js')}"></script>
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
        var treeWidget;

        require([
            "dojo/_base/array",
            "dojo/parser",
            "dojo/ready",
            "dojo/data/ItemFileWriteStore",
            "cbtree/models/TreeStoreModel",
            "cbtree/Tree",
            "dijit/tree/dndSource",
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
            Tree,
            dndSource,
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

            treeWidget = new Tree({
                model: treeModel,
                autoExpand: true,
                showRoot: false,
                branchReadOnly: true,
                dndController: dndSource
            });

            treeWidget.on("checkBoxClick", function (item, nodeWidget, evt) {
                layers[item.id].olLayer.setVisibility(nodeWidget.get("checked"));
            });

            array.forEach(layerConfig, function (l) {
                layers[l.id] = new adapters.tms(l);
            });

            ready(function() {
                treeWidget.placeAt("layer_tree");

                dojoMap = new Map("map");
                array.forEach(layerConfig, function(l) {
                    dojoMap.olMap.addLayer(layers[l.id].olLayer);
                });
            });

        });

    </script>

    <style type="text/css">
        body, html { width: 100%; height: 100%; margin:0; padding: 0; overflow: hidden; }
    </style>
</%def>

<div data-dojo-type="dijit/layout/TabContainer" style="width: 100%; height: 100%;"
        data-dojo-props="tabPosition: 'bottom'">

    <div data-dojo-type="dijit/layout/BorderContainer" style="height: 100%" title="Карта"
            data-dojo-props="closable: false">

        <div data-dojo-type="dijit/Toolbar" data-dojo-props="region: 'top'">
            <div data-dojo-type="dijit/form/Button">Идентификация</div>
        </div>
        
        <div data-dojo-type="dijit/layout/BorderContainer" style="height: 100%; width: 250px; padding: 0"  data-dojo-props="region: 'left', splitter: true">
            <div id="layer_tree" data-dojo-type="dijit/layout/ContentPane"
                    data-dojo-props="region: 'center'"
                    style="padding: 0;">
            </div>
            <div data-dojo-type="dijit/layout/ContentPane" style="padding: 0; border: none;"
                    data-dojo-props="region: 'bottom'">
                <select data-dojo-type="dijit/form/Select" style="width: 99%;">
                    <option>OSM - Mapnik</option>
                    <option>Google</option>
                </select>
            </div>

        </div>

        <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region: 'center'" style="padding: 0;">
            <div style="width: 100%; height: 100%;" id="map"></div>
        </div>

    </div>

</div>
