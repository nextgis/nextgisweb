<%inherit file='../base.mako' />

<% import json %>

<script>
    var aclItems = ${ acl_items | json.dumps, n},
        resource = ${ resource | json.dumps, n};

    require([
        "dojo/parser",
        "dojo/ready",
        "security/AclEditor"
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
    data-dojo-type="security/AclEditor"
    data-dojo-props="items: aclItems, resource: resource"
    style="width: 100%; height: 400px">
</div>