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
        var dojoMap;
        var layers = {};

        require(['dojo/ready', 'dojox/geo/openlayers/Map'], function (ready, Map) {
            ready(function() {
                dojoMap = new Map("map");
                ${layer_group_js(root_layer_group)}
            })
        });

        require(
            ['dojo/parser', 'dojo/domReady', 'dojo/data/ItemFileWriteStore', 'cbtree/Tree', 'cbtree/models/ForestStoreModel', 'dojo/_base/connect'],
            function (parser, domReady, ItemFileWriteStore, Tree, ForestStoreModel, connect) {
                parser.parse(); 

                function checkBoxClicked( item, nodeWidget, evt ) {
                    console.log(item);
                  alert( "The new state for " + this.getLabel(item) + " is: " + nodeWidget.get("checked") );
                };

                var store = new ItemFileWriteStore({url: ${request.route_url('webmap.layer_hierarchy', id=obj.id) | json.dumps}});
                var model = new ForestStoreModel({
                    store: store,
                    query: {type: 'parent'},
                    checkedAll: false
                }); 

                var tree = new Tree({model: model, autoExpand: true, showRoot: false, branchReadOnly: true});
                connect.connect(tree, "onCheckBoxClick", model, function (item, nodeWidget, evt) {
                    layers[item.layer_id].setVisibility(nodeWidget.get("checked"));
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

