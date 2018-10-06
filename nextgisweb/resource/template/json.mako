<%inherit file='nextgisweb:templates/obj.mako' />

<% from nextgisweb.geojson import dumps %>

<script type="text/javascript">
    require(["ngw-pyramid/form/CodeMirror", "dojo/domReady!"], function (CodeMirror) {
        var cm = new CodeMirror({autoHeight: true, lang: "javascript", mode: "javascript", lineNumbers: true, readonly: true}).placeAt('content');
        cm.set("value", ${dumps(dumps(objjson, ensure_ascii=False, indent=4)) | n});
    });
</script>

<div id="content">

</div>
