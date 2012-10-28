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
    <script type="text/javascript">
        var dojoMap;
        var layers = {};

        require(['dojo/ready', 'dojox/geo/openlayers/Map'], function (ready, Map) {
            ready(function() {
                dojoMap = new Map("map");

                ${layer_group_js(root_layer_group)}
            })
        });

        function toggleLayer(id, visibility) {
            layers[id].setVisibility(visibility);
        };
    </script>
</%def>

<%def name="layer_group(item)">
    <div>
        <div>${item.display_name}</div>
        <div style="margin-left: 1em;">
            %for subgroup in item.children:
                ${layer_group(subgroup)}
            %endfor

            %for layer in item.layers:
                <div>
                    <input id="layer_${layer.id}" type="checkbox" onChange="toggleLayer(${layer.id}, this.checked);"/>
                    <label for="layer_${layer.id}" style="font-weight: normal;">${layer.display_name}</layer>
                </div>
            %endfor
        </div>
    </div>
</%def>

<div class="span-6">
    ${layer_group(root_layer_group)}
</div>

<div class="span-18 last">
    <div id="map" style="height: 600px;"></div>
</div>