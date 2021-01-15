<% import json %>
<%! from nextgisweb.feature_layer.util import _ %>

<%inherit file="nextgisweb:resource/template/section_api.mako"/>

<%block name="content">
    <div class="row-title">
        <div class="text">${tr(_("TMS service"))}</div>
        <div class="material-icons material-icons-help_outline help">
            <div class="tooltip-content">
                <div class="tooltip-help">
                    ${tr(_('TMS (Tile Map Service) is a specification for tiled web maps. Tiled web map is a map displayed in a browser by seamlessly joining dozens of individually requested image.'))}
                    <br/>
                    <a target="_blank"
                       href="${tr(_('https://docs.nextgis.com/docs_ngweb_dev/doc/developer/misc.html#render'))}">
                        ${tr(_("Read more"))}
                    </a>
                    <div class="material-icons material-icons-exit_to_app"></div>
                </div>
            </div>
        </div>
    </div>
    <div class="row-input-info">
        <div class="text"
             data-value="${request.route_url('render.tile', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}'}">
            ${request.route_url('render.tile', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}'}
        </div>
    </div>
</%block>
