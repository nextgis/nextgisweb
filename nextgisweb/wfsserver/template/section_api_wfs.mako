<%! from nextgisweb.wfsserver.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
    <div class="row-title">
        <div class="text">${tr(_("Web Feature Service (WFS)"))}</div>
        <div class="material-icons icon-helpOutline help">
            <div class="tooltip-content">
                <div class="tooltip-help">
                    ${tr(_('Web Feature Service (WFS) provides an interface allowing requests for geographical features across the web using platform-independent calls.'))}

                    %if request.env.pyramid.options['nextgis_external_docs_links']:
                        <br/>
                        <a target="_blank"
                           href="${tr(_('https://docs.nextgis.com/docs_ngweb/source/layers.html#wfs-service'))}">
                            ${tr(_("Read more"))}
                        </a>
                        <div class="material-icons icon-exitToApp"></div>
                    %endif
                </div>
            </div>
        </div>
    </div>
    <div class="row-input-info">
        <% url_wfs = request.route_url('wfsserver.wfs', id=obj.id) %>
        <div class="text" data-value="${url_wfs}">
            ${url_wfs}
        </div>
    </div>
</%block>
