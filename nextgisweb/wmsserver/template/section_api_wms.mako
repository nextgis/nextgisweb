<%! from nextgisweb.wmsserver.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
<% url_wms = request.route_url('wmsserver.wms', id=obj.id) %>
<% external_doc_enabled = request.env.pyramid.options['nextgis_external_docs_links'] %>

<div class="section-api-item"
     data-title="${tr(_('WMS service'))}"
     data-tooltip-text="${tr(_('Web Map Service (WMS) is a standard protocol developed by the Open Geospatial Consortium for serving georeferenced map images. These images are typically produced by a map server from data provided by a GIS database.'))}"
     data-url="${url_wms}"
     data-external-doc-enabled="${external_doc_enabled}"
     data-external-doc-url="${tr(_('https://docs.nextgis.com/docs_ngweb/source/layers.html#using-wms-service-connection'))}"
     data-external-doc-text="${tr(_('Read more'))}">
</div>
</%block>
