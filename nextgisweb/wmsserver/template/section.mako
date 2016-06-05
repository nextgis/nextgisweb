<%! from nextgisweb.wmsserver.util import _ %>
<% url = request.route_url('wmsserver.wms', id=obj.id) %>

<p>
    <span class="label-text">${tr(_('WMS service address'))}:</span>
    <span class="middle-text">${url}</span>
</p>
<div class="content-box__info content-box__info--bottom">
	${tr(_('Use this link in desktop client to access and edit vector data.'))}
</div>