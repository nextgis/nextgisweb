<%inherit file='nextgisweb:pyramid/template/obj.mako' />

<script type="text/javascript">
    require([
        "dojo/dom",
        "ngw-feature-layer/FeatureDisplayWidget",
        "dojo/domReady!"
    ], function (dom, FeatureDisplayWidget) {
        var ext = ${json_js(list(ext_mid.keys()))},
            mid = ${json_js(list(ext_mid.values()))};

        require(mid, function () {
            var extmid = {};
            for (var i = 0; i < arguments.length; i++) { extmid[ext[i]] = arguments[i] };

            var widget = new FeatureDisplayWidget({
                resourceId: ${json_js(obj.id)},
                featureId: ${json_js(feature_id)},
                extmid: extmid,
                style: "width: 100%; height: 100%; padding: 1px;"});

            widget.placeAt(dom.byId("widget"));
            widget.startup();
            widget.load();
        });
    });
</script>

<div id="widget" style="width: 100%; height: 100%; padding: 0;"></div>
