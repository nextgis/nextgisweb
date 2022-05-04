<%! from nextgisweb.raster_layer.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
<% url_cog = request.route_url('raster_layer.cog', id=obj.id) %>
<% external_doc_enabled = request.env.pyramid.options['nextgis_external_docs_links'] %>

<div class="section-api-item"
     data-title="${tr(_('Cloud Optimized GeoTIFF'))}"
     data-tooltip-text="${tr(_('A Cloud Optimized GeoTIFF (COG) is a regular GeoTIFF file, aimed at being hosted on a HTTP file server, with an internal organization that enables more efficient workflows on the cloud. It does this by leveraging the ability of clients issuing ​HTTP GET range requests to ask for just the parts of a file they need.'))}"
     data-url="${url_cog}"
     data-external-doc-enabled="${external_doc_enabled}"
     data-external-doc-url=""
     data-external-doc-text="">
</div>
</%block>
