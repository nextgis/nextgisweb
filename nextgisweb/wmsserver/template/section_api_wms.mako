<%! from nextgisweb.wmsserver.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
    <div class="row-title">
        <div class="text">${tr(_("WMS service"))}</div>
        <span class="help">
            <svg class="icon icon-s" fill="currentColor"><use xlink:href="#icon-material-help_outline"/></svg>
            <div class="tooltip-content">
                <div class="tooltip-help">
                    ${tr(_('Web Map Service (WMS) is a standard protocol developed by the Open Geospatial Consortium for serving georeferenced map images. These images are typically produced by a map server from data provided by a GIS database.'))}

                    %if request.env.pyramid.options['nextgis_external_docs_links']:
                        <br/>
                        <a target="_blank"
                           href="${tr(_('https://docs.nextgis.com/docs_ngweb/source/layers.html#using-wms-service-connection'))}">
                            ${tr(_("Read more"))}
                        </a>
                        <div class="material-icons icon-exitToApp"></div>
                    %endif
                </div>
            </div>
        </span>
    </div>
    <div class="row-input-info">
        <% url_wms = request.route_url('wmsserver.wms', id=obj.id) %>
        <div class="text" data-value="${url_wms}">
            ${url_wms}
        </div>
    </div>
</%block>
