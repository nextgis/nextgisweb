<%inherit file='../../base.mako' />

<% import json %>

<script>
    var editorValue = ${ value | json.dumps, n};

    require(["dojo/parser"], function (parser) {
        parser.parse();
    });
</script>



<div data-dojo-id="editor"
    data-dojo-type="security/AclEditor"
    data-dojo-props="value: editorValue"
    style="width: 100%; height: 300px">

</div>