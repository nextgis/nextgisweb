<% import json %>
<%! from nextgisweb.feature_layer.util import _ %>

<div class="content-box__description">${tr(_("Use the addresses below to retrieve layer data from other applications."))}</div>

<div class="content-box section-api-layer">
    <div class="row-title">
        <div class="text">${tr(_("MVT Vector Tiles"))}</div>
        <div class="material-icons material-icons-help_outline help">
            <div class="tooltip-content">
                <div class="tooltip-help">
                    ${tr(_('The Mapbox Vector Tile is an efficient encoding for map data into vector tiles that can be rendered dynamically.'))}
                    <br/>
                    <a target="_blank"
                       href="${tr(_('https://docs.nextgis.com/docs_ngweb_dev/doc/developer/misc.html#mvt-vector-tiles'))}">
                        ${tr(_("Read more"))}
                    </a>
                    <div class="material-icons material-icons-exit_to_app"></div>
                </div>
            </div>
        </div>
    </div>
    <div class="row-input-info">
        <div class="text"
             data-value="${request.route_url('feature_layer.mvt', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}'}">
            ${request.route_url('feature_layer.mvt', _query={'resource': obj.id }) + '&x={x}&y={y}&z={z}'}
        </div>
    </div>
</div>

<script>
    require([
        "dojo/query",
        "dojo/_base/array",
        "dojo/dom-attr",
        "dijit/Tooltip",
        "ngw-pyramid/CopyButton/CopyButton"
    ], function (query, array, domAttr, Tooltip, CopyButton) {
        var helpIcons = query(".section-api-layer .help");
        array.forEach(helpIcons, function (helpIcon) {
            var label = query('.tooltip-content', helpIcon);
            new Tooltip({
                connectId: [helpIcon],
                label: label[0].innerHTML
            });
        });

        var domCopyButtons = query(".section-api-layer .row-input-info .text");
        array.forEach(domCopyButtons, function (domCopyButton) {
            var copyButton = new CopyButton({
                target: domCopyButton,
                targetAttribute: function (target) {
                    return domAttr.get(target, "data-value");
                }
            });
            copyButton.placeAt(domCopyButton.parentNode, "last");
        });
    });
</script>
