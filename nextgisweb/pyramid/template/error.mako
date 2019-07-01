<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%!
import json
from pyramid.httpexceptions import HTTPNotFound
from nextgisweb.pyramid.util import _
from nextgisweb.pyramid.error import json_error
%>

<%def name="head()">
    <script type="text/javascript">
        require([
            "dojo/dom",
            "dojo/on",
            "dojo/dom-style",
            "dojo/domReady!"
        ], function (
            dom,
            on,
            domStyle
        ) {
            var link = dom.byId('tInfoLink');
            var data = dom.byId('tInfoData');
            
            on(link, 'click', function () {
                domStyle.set(link, 'display', 'none');
                domStyle.set(data, 'display', 'block');
            });
        });
    </script>
</%def>

<%def name="title_block()">
    <h1>${err_info.http_status_code} ${tr(err_info.title)}</h1>
</%def>

${tr(err_info.message)}

<div style="margin-top: 2ex;">
    <a id="tInfoLink" style="text-decoration: none;">${tr(_("Show technical info"))}</a>
    <pre id='tInfoData' style="display: none;">${json.dumps(json_error(request, err_info, exc, exc_info, debug=debug), indent=2)}</pre>
</div>