<%! from nextgisweb.wmsserver.util import _ %>
<% url = request.route_url('wmsserver.wms', id=obj.id) %>

<div style="font-size: 120%">
    ${tr(_('WMS URL'))}: <a href="${url}">${url}</a>
</div>