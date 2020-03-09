<%! from nextgisweb.wfsserver.util import _ %>
<% url = request.route_url('wfsserver.wfs', id=obj.id) %>
<% example = request.env.pyramid.options['desktop_gis_example'] %>

<p>
    <span class="label-text">${tr(_('WFS service address'))}:</span>
    <span class="middle-text">${url}</span>
</p>
<div class="content-box__info content-box__info--bottom">
    ${tr(_('Use this link in desktop client (e.g. {example}) to access and edit vector data.')).format(example=example)}
</div>
