<% import json %>
<%! from nextgisweb.feature_layer.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
    <div class="row-title">
        <div class="text">${tr(_("MVT Vector Tiles"))}</div>
        <span class="help">
            <svg class="icon icon-s" fill="currentColor"><use xlink:href="#icon-material-help_outline"/></svg>
            <div class="tooltip-content">
                <div class="tooltip-help">
                    ${tr(_('The Mapbox Vector Tile is an efficient encoding for map data into vector tiles that can be rendered dynamically.'))}

                    %if request.env.pyramid.options['nextgis_external_docs_links']:
                        <br/>
                        <a target="_blank"
                           href="${tr(_('https://docs.nextgis.com/docs_ngweb_dev/doc/developer/misc.html#mvt-vector-tiles'))}">
                            ${tr(_("Read more"))}
                        </a>
                        <div class="material-icons icon-exitToApp"></div>
                    %endif
                </div>
            </div>
        </span>
    </div>
    <div class="row-input-info">
        <% url_mvt = request.route_url('feature_layer.mvt', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}' %>
        <div class="text" data-value="${url_mvt}">
            ${url_mvt}
        </div>
    </div>
</%block>
