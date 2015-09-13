<%! from nextgisweb.wfsserver.util import _ %>
<% url = request.route_url('wfsserver.wfs', id=obj.id) %>

<div style="font-size: 120%">
    ${tr(_('WFS URL'))}: <a href="${url}">${url}</a>
</div>