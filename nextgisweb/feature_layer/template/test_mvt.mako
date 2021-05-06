<!DOCTYPE html>
<html>
  <head>
    <title>MVT Test Page</title>
    <style>
      html, body, #map {
        margin: 0;
        width: 100%;
        height: 100;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
      <script src="${request.route_url('amd_package', subpath='dojo/dojo.js')}"></script>
      <script>
        var amdUrl = "${request.route_url('amd_package', subpath="")}";
        require([
          "openlayers/ol",
          "xstyle/css!dist/external-ol/ol.css",
        ], function (ol) {
          var osm = new ol.layer.Tile({
            source: new ol.source.OSM()
          });
          var map = new ol.Map({
            target: "map",
            layers: [osm],
            view: new ol.View({
              center: ol.proj.fromLonLat([0, 0]),
              zoom: 3
            })
          });
          var mvt = new ol.layer.VectorTile({
            source: new ol.source.VectorTile({
              format: new ol.format.MVT(),
              tileGrid: ol.tilegrid.createXYZ({maxZoom: 22}),
              tilePixelRatio: parseInt(${request.GET.get('extent', 4096)} / 256),
              wrapX: false,
              url: "${request.route_url('feature_layer.mvt', _query=request.GET)}" + "&x={x}&y={y}&z={z}"
            })
          });
          map.addLayer(mvt);
        });
      </script>
  </body>
</html>