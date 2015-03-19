<%inherit file='nextgisweb:templates/obj.mako' />

<% import json %>

<script type="text/javascript">
    require([
        "dojo/dom",
        "ngw-feature-layer/FeatureWidget",
        "dojo/domReady!"
    ], function (dom, FeatureWidget) {
        var ext = ${ ext_mid.keys() | json.dumps, n },
            mid = ${ ext_mid.values() | json.dumps, n };

        require(mid, function () {
            var extmid = {};
            for (var i = 0; i < arguments.length; i++) { extmid[ext[i]] = arguments[i] };

            var widget = new FeatureWidget({
                resource: ${ obj.id | json.dumps, n },
                feature: ${ feature_id | json.dumps, n },
                extmid: extmid,
                fields: ${ fields | json.dumps, n },
                style: "width: 100%; height: 100%; padding: 1px;"});

            widget.placeAt(dom.byId("widget"));
            widget.startup();
            widget.load();
        });
    });
</script>

<div id="widget" style="width: 100%; height: 100%; padding: 0;"></div>