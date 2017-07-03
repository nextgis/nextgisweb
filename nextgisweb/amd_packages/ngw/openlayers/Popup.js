define([
    "dojo/dom-construct",
    "openlayers/ol",

    //templates
    "xstyle/css!./resource/Popup.css"
], function (
    domConstruct,
    ol
) {
    var Popup = function(options) {

        this.title = options.title;

        this.container = domConstruct.create("div", {
            class: "ngwPopup dijitTooltipBelow"
        });

        this.subcontainer = domConstruct.create("div", {
            class: "dijitTooltipContainer",
            style: {
                "background-color": "white",
                "padding": 0
            }
        }, this.container);

        this.contentDiv = domConstruct.create("div", {
            class: "ngwPopup__content",
            style: {
                "width": options.size[0] + "px",
                "height": options.size[1] + "px",
                "margin": "1px"
            }
        }, this.subcontainer, "last");

        // Header
        this.titleBar = domConstruct.create("div", {
            class: "ngwPopup__title",
        }, this.subcontainer, "first");

        this.titleSpan = domConstruct.create("span", {
            innerHTML: this.title ? this.title : "&nbsp;",
        }, this.titleBar, "last");

        // Close button in the header
        this._closeSpan = domConstruct.create("span", {
            class: "dijitDialogCloseIcon",
            style: "margin-top: 2px"
        }, this.titleBar, "last");

        // Connecting arrow
        this._connectorDiv = domConstruct.create("div", {
            class: "dijitTooltipConnector"
        }, this.container, 'first');

        ol.Overlay.call(this, {
            element: this.container,
            autoPan: true,
            offset: [-13, -8],
            autoPanAnimation: {
                duration: 250
            }
        });
    };

    ol.inherits(Popup, ol.Overlay);

    Popup.prototype.setTitle = function (title) {
        this.titleSpan.innerHTML = title;
    };

    return Popup;

});
