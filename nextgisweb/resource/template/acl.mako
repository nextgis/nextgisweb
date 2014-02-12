<%inherit file='nextgisweb:templates/obj.mako' />

<% import json %>

<script>

    require([
        "dojo/parser",
        "dojo/ready",
        "ngw-resource/AclEditor"
    ], function (
        parser,
        ready
    ) {
        ready(function() {
            parser.parse();
        });
    });
</script> 

<div data-dojo-id="editor"
    data-dojo-type="ngw-resource/AclEditor"
    data-dojo-props="resourceId: ${obj.id}"
    style="width: 100%; height: 400px">
</div>