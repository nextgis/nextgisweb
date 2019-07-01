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
    <h1>${tr(err_info.message)}</h1>
</%def>

%if err_info.http_status_code == 404:
    ${tr(_('Think this page should be here?'))}
    <a href="${tr(_('http://nextgis.com/contact/'))}"
    target="_blank">${tr(_('Contact us'))}</a>.
%endif

<div style="margin-top: 2ex;">
    <a id="tInfoLink" style="text-decoration: none;">${tr(_("Show technical info"))}</a>
    <pre id='tInfoData' style="display: none;">${json.dumps(json_error(request, err_info, exc, exc_info, debug=debug), indent=2)}</pre>
</div>