<%! from nextgisweb.wmsserver.util import _ %>
<% url = request.route_url('wmsserver.wms', id=obj.id) %>
<% example = request.env.pyramid.options['desktop_gis_example'] %>

<p>
    <span class="label-text">${tr(_('WMS service address'))}:</span>
    <span class="middle-text">${url}</span>
</p>
<div class="content-box__info content-box__info--bottom">
    ${tr(_('Use this link in desktop client (e.g. {example}) to access raster representation of your data layers.')).format(example=example)}
</div>
