<%! from nextgisweb.wfsserver.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
<% url_wfs = request.route_url('wfsserver.wfs', id=obj.id) %>
<% external_doc_enabled = request.env.pyramid.options['nextgis_external_docs_links'] %>

<div class="section-api-item"
     data-title="${tr(_('Web Feature Service (WFS)'))}"
     data-tooltip-text="${tr(_('Web Feature Service (WFS) provides an interface allowing requests for geographical features across the web using platform-independent calls.'))}"
     data-url="${url_wfs}"
     data-external-doc-enabled="${external_doc_enabled}"
     data-external-doc-url="${tr(_('https://docs.nextgis.com/docs_ngweb/source/layers.html#wfs-service'))}"
     data-external-doc-text="${tr(_('Read more'))}">
</div>
</%block>
