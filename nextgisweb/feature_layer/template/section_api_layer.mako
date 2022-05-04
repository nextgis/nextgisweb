<% import json %>
<%! from nextgisweb.feature_layer.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
<% url_mvt = request.route_url('feature_layer.mvt', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}' %>
<% external_doc_enabled = request.env.pyramid.options['nextgis_external_docs_links'] %>

<div class="section-api-item"
     data-title="${tr(_('MVT Vector Tiles'))}"
     data-tooltip-text="${tr(_('The Mapbox Vector Tile is an efficient encoding for map data into vector tiles that can be rendered dynamically.'))}"
     data-url="${url_mvt}"
     data-external-doc-enabled="${external_doc_enabled}"
     data-external-doc-url="${tr(_('https://docs.nextgis.com/docs_ngweb_dev/doc/developer/misc.html#mvt-vector-tiles'))}"
     data-external-doc-text="${tr(_('Read more'))}">
</div>
</%block>
