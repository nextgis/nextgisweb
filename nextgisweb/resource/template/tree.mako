<%inherit file='nextgisweb:templates/obj.mako' />

<% import json %>

<script>

    require([
        "dojo/parser",
        "dojo/ready",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "ngw-resource/Tree"
    ], function (
        parser,
        ready
    ) {
        ready(function() {
            parser.parse();
        });
    });
</script> 

<div data-dojo-type="dijit/layout/BorderContainer"
    style="width: 100%; height: 100%">

    <div data-dojo-id="tree"
        data-dojo-type="ngw-resource/Tree"
        data-dojo-props="resourceId: ${obj.id}, region: 'left'"
        style="width: 300px; background-color:#fff">
    </div>

    <div data-dojo-type="dijit/layout/ContentPane"
        data-dojo-props="region: 'center'"
        style="width: 100%">

    </div>

</div>