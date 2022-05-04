<% import json %>
<%! from nextgisweb.render.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
<% url_tms = request.route_url('render.tile', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}' %>
<% external_doc_enabled = request.env.pyramid.options['nextgis_external_docs_links'] %>

<div class="section-api-item"
     data-title="${tr(_('TMS (Tile Map Service)'))}"
     data-tooltip-text="${tr(_('TMS (Tile Map Service) is a specification for tiled web maps. Tiled web map is a map displayed in a browser by seamlessly joining dozens of individually requested image.'))}"
     data-url="${url_tms}"
     data-external-doc-enabled="${external_doc_enabled}"
     data-external-doc-url="${tr(_('https://docs.nextgis.com/docs_ngweb_dev/doc/developer/misc.html#render'))}"
     data-external-doc-text="${tr(_('Read more'))}">
</div>
</%block>
