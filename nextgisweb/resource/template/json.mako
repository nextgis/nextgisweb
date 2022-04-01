<%inherit file='nextgisweb:templates/obj.mako' />

<% from nextgisweb.lib.json import dumps %>

<script type="text/javascript">
    require(["ngw-pyramid/form/CodeMirror", "dojo/domReady!"], function (CodeMirror) {
        var cm = new CodeMirror({autoHeight: true, lang: "javascript", mode: "javascript", lineNumbers: true, readonly: true}).placeAt('content');
        cm.set("value", ${dumps(dumps(objjson, pretty=True)) | n});
    });
</script>

<div id="content">

</div>
