<% import json %>
<%! from nextgisweb.resource.util import _ %>

<div class="content-box__description">${tr(_("Use the addresses below to retrieve layer data from other applications."))}</div>

<div class="content-box section-api">
    <%block name="content"/>
</div>

<script>
    require([
        "dojo/query",
        "dojo/_base/array",
        "dojo/dom-attr",
        "dijit/Tooltip",
        "ngw-pyramid/CopyButton/CopyButton"
    ], function (query, array, domAttr, Tooltip, CopyButton) {
        var helpIcons = query(".section-api .help");
        array.forEach(helpIcons, function (helpIcon) {
            var label = query('.tooltip-content', helpIcon);
            new Tooltip({
                connectId: [helpIcon],
                label: label[0].innerHTML
            });
        });

        var domCopyButtons = query(".section-api .row-input-info .text");
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
