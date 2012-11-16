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
            ['dojo/domReady', 'dojo/data/ItemFileWriteStore', 'cbtree/Tree', 'cbtree/models/ForestStoreModel', 'dojo/_base/connect'],
            function (domReady, ItemFileWriteStore, Tree, ForestStoreModel, connect) {

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
</%def>

<div class="span-6">
    <div id="layer_tree"></div>
    &nbsp;
</div>

<div class="span-18 last">
    <div id="map" style="height: 600px;"></div>
</div>

