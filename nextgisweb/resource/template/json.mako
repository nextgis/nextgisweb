<%inherit file='nextgisweb:templates/obj.mako' />

<script type="text/javascript">
    require(["ngw-pyramid/form/CodeMirror", "dojo/domReady!"], function (CodeMirror) {
        var cm = new CodeMirror({autoHeight: true, lang: "javascript", mode: "javascript", lineNumbers: true, readonly: true}).placeAt('content');
        cm.set("value", ${json_js(json_js(objjson, pretty=True))});
    });
</script>

<div id="content">

</div>
