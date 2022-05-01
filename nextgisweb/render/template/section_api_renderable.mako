<% import json %>
<%! from nextgisweb.render.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
    <div class="row-title">
        <div class="text">${tr(_("TMS (Tile Map Service)"))}</div>
        <span class="help">
            <svg class="icon icon-s" fill="currentColor"><use xlink:href="#icon-material-help_outline"/></svg>
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
        </span>
    </div>
    <div class="row-input-info">
        <% url_tms = request.route_url('render.tile', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}' %>
        <div class="text"
             data-value="${url_tms}">
            ${url_tms}
        </div>
    </div>
</%block>
