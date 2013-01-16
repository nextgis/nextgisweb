define([
    "dojo/dom-construct",
    "dojo/dom-style"
], function (
    domConstruct,
    domStyle
) {
    var Popup = OpenLayers.Class(OpenLayers.Popup, {
        displayClass: "ngwPopup dijitTooltipBelow",
        contentDisplayClass: "dijitTooltipContainer",
        padding: new OpenLayers.Bounds([2, 2, 2, 10]),

        setBorder: function () {
            // заглушка, чтобы OL не портили popup border
        },

        initialize: function(id, lonlat, contentSize, contentHTML, closeBox, closeBoxCallback) {
            OpenLayers.Popup.prototype.initialize.apply(this, arguments);

            domStyle.set(this.contentDiv, "width", contentSize.w - 10);

            domConstruct.create("div", {
                class: "dijitTooltipConnector"
            }, this.div, 'first');
            

        },

        draw: function (px) {
            var result = OpenLayers.Popup.prototype.draw.apply(this, arguments);
            domStyle.set(result, "background", "rgba(255, 255, 255, 0)");

            return result;
        },

        moveTo: function (px) {
            px.x = px.x - 12;
            px.y = px.y - 8;
            OpenLayers.Popup.prototype.moveTo.apply(this, [px]);
        }
    });

    return Popup;
});