<%! from nextgisweb.webmap.util import webmap_items_to_tms_ids_list, _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
    <div class="row-title">
        <div class="text">${tr(_("TMS (Tile Map Service)"))}</div>
        <div class="material-icons icon-helpOutline help">
            <div class="tooltip-content">
                <div class="tooltip-help">
                    ${tr(_('TMS (Tile Map Service) is a specification for tiled web maps. Tiled web map is a map displayed in a browser by seamlessly joining dozens of individually requested image.'))}

                    %if request.env.pyramid.options['nextgis_external_docs_links']:
                        <br/>
                        <a target="_blank"
                           href="${tr(_('https://docs.nextgis.com/docs_ngweb_dev/doc/developer/misc.html#render'))}">
                            ${tr(_("Read more"))}
                        </a>
                        <div class="material-icons icon-exitToApp"></div>
                    %endif
                </div>
            </div>
        </div>
    </div>
    <div class="row-input-info">
        <% layers_ids = webmap_items_to_tms_ids_list(obj) %>
        <% layers_ids_str = ','.join(str(id) for id in layers_ids) %>
        <% url_webmap_tms = request.route_url('render.tile') + '?resource=' + layers_ids_str + '&x={x}&y={y}&z={z}' %>
        <div class="text" data-value="${url_webmap_tms}">
            ${url_webmap_tms}
        </div>
    </div>
</%block>
