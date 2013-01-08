<%inherit file="../obj.mako" />
<% import json %>

<script type="text/javascript">
    var grid;
    var gridOptions = {
        selectionMode: "single",
        columns: {
            id: "#"
        }
    };

    var gridData = ${[
        dict(id=feature.id, **feature.fields)
        for feature in features
    ] | json.dumps, n};

    %for f in features.fields:
    gridOptions.columns[${ f.keyname | json.dumps, n}] = ${ f.keyname | json.dumps, n};
    %endfor

    require(["dojo/parser"], function (parser) { parser.parse() });
    require(
        ["dojo/_base/declare", "dgrid/Grid", "dgrid/Selection", "dojo/domReady!"],
        function (declare, Grid, Selection){
            var CustomGrid = declare([Grid, Selection])
            grid = new CustomGrid(gridOptions, "grid");

            grid.on("dgrid-select", function (event) {
                window.location = ${request.route_url('feature_layer.feature.browse', id=obj.id) | json.dumps, n}
                    + event.rows[0].data.id;
            });

            grid.renderArray(gridData);
        }
    );

</script>

<div id="grid"></div>
