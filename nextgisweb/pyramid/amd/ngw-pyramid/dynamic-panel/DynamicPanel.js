define([
    "dojo/_base/declare",
    "@nextgisweb/pyramid/i18n!",
    "dojo/query",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/_WidgetBase",
    "@nextgisweb/pyramid/icon",
    "dojo/text!./DynamicPanel.hbs",
    "dijit/form/Select",
    "xstyle/css!./DynamicPanel.css",
], function (
    declare,
    i18n,
    query,
    lang,
    domConstruct,
    domClass,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    _WidgetBase,
    icon,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: i18n.renderTemplate(template),
        title: "",
        name: undefined,
        contentWidget: undefined,
        isOpen: false,
        withOverlay: false,
        withTitle: true,
        withCloser: true,

        makeComp: undefined,
        options: undefined,

        constructor: function (options) {
            this.setDefaultOptions(options);
            this.options = options;
            declare.safeMixin(this, options);
        },

        setDefaultOptions: function (options) {
            if (!("gutters" in options)) {
                options.gutters = false;
            }
            if (!("region" in options)) {
                options.region = "left";
            }
            if (!("class" in options)) {
                options.class = "dynamic-panel--fullwidth";
            }
        },

        postCreate: function () {
            if (this.contentWidget)
                this.contentWidget.placeAt(this.contentNode);

            if (this.makeComp && this.makeComp instanceof Function) {
                this.makeComp(this.contentNode, this.options);
            }

            if (this.isOpen) this.show();

            if (this.withCloser) this._createCloser();

            if (this.withOverlay) this._createOverlay();

            if (!this.withTitle) {
                domClass.add(this.domNode, "dynamic-panel--notitle");
            }
        },

        show: function () {
            this.isOpen = true;
            this.domNode.style.display = "block";
            if (this.overlay) this.overlay.style.display = "block";
            if (this.getParent()) this.getParent().resize();

            if (this.makeComp && this.makeComp instanceof Function) {
                this.makeComp(this.contentNode, this.options);
            }
        },

        hide: function () {
            this.isOpen = false;
            this.domNode.style.display = "none";
            if (this.getParent()) this.getParent().resize();
            if (this.overlay) this.overlay.style.display = "none";

            if (this.makeComp && this.makeComp instanceof Function) {
                this.makeComp(this.contentNode, this.options);
            }
        },

        _createCloser: function () {
            this.closer = domConstruct.create("span", {
                class: "dynamic-panel__closer",
                innerHTML:
                    '<span class="ol-control__icon">' +
                    icon.html({ glyph: "close" }) +
                    "</span>",
            });
            domConstruct.place(this.closer, this.domNode);

            query(this.closer).on(
                "click",
                lang.hitch(this, function () {
                    this.emit("closed", this);
                })
            );
        },

        _createOverlay: function () {
            this.overlay = domConstruct.create("div", {
                class: "overlay",
            });
            domConstruct.place(this.overlay, document.body);
            query(this.overlay).on(
                "click",
                lang.hitch(this, function () {
                    this.hide();
                })
            );
        },
    });
});
