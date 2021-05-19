<%inherit file='nextgisweb:pyramid/template/base.mako' />

<div id="map" style="width: 100%; height: 512px;"></div>
<script>
    require(["@nextgisweb/feature-layer/test-mvt"], function (testMvt) {
      testMvt.default({target: "map", resource: ${resource} });
    })
</script>
