<%! from nextgisweb.raster_layer.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
    <div class="row-title">
        <div class="text">${tr(_("Cloud Optimized GeoTIFF"))}</div>
        <div class="material-icons icon-helpOutline help">
            <div class="tooltip-content">
                <div class="tooltip-help">
                    ${tr(_('A Cloud Optimized GeoTIFF (COG) is a regular GeoTIFF file, aimed at being hosted on a HTTP file server, with an internal organization that enables more efficient workflows on the cloud. It does this by leveraging the ability of clients issuing ​HTTP GET range requests to ask for just the parts of a file they need.'))}
                </div>
            </div>
        </div>
    </div>
    <div class="row-input-info">
        <% url_cog = request.route_url('raster_layer.cog', id=obj.id) %>
        <div class="text" data-value="${url_cog}">
            ${url_cog}
        </div>
    </div>
</%block>
