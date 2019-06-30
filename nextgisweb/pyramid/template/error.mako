<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%!
import json
from nextgisweb.pyramid.util import _
from nextgisweb.pyramid.error import json_error
%>

<%def name="head()">
    <% import json %>

    <script type="text/javascript">
        require([
            "dojo/parser",
            "dojo/ready"
        ], function (
            parser,
            ready
        ) {
            ready(function() {
                parser.parse();
            });
        });
    </script>
</%def>

<h1>${err_info.http_status_code}: ${tr(err_info.message)}</h1>


<script type="text/javascript">
    require(["ngw-pyramid/form/CodeMirror", "dojo/domReady!"], function (CodeMirror) {
        var cm = new CodeMirror({autoHeight: true, lang: "javascript", mode: "javascript", lineNumbers: true, readonly: true}).placeAt('content');
        cm.set("value", ${json.dumps(json.dumps(json_error(request, err_info, exc, exc_info, debug=debug), indent=2)) | n});
    });
</script>


<div id="content"></div>
