<%inherit file='nextgisweb:templates/base.mako' />
<%! from json import dumps %>

<script type="text/javascript">
    require(["ngw-pyramid/form/CodeMirror", "dojo/domReady!"], function (CodeMirror) {
        var cm = new CodeMirror({autoHeight: true, lang: "javascript", mode: "javascript", lineNumbers: true, readonly: true}).placeAt('content');
        cm.set("value", ${dumps(dumps(doc['_source'], ensure_ascii=False, indent=2)) | n});
    });
</script>

<div id="content">

</div>