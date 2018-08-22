define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "dijit/form/Button", "dijit/form/TextBox", "dijit/form/CheckBox", "dijit/form/SimpleTextarea",
    'dojo/_base/lang', 'dojo/promise/all',
    'ngw-webmap/Permalink',
    'dojox/dtl/_base', 'dojox/dtl/Context',
    "dojo/text!./SharePanel.hbs",
    "svg4everybody/svg4everybody",

    //templates
    "xstyle/css!./SharePanel.css"
], function (
    declare,
    i18n,
    hbsI18n,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    DynamicPanel,
    BorderContainer,
    Button, TextBox, CheckBox, SimpleTextarea,
    lang, all,
    Permalink,
    dtl, dtlContext,
    template,
    svg4everybody) {
    return declare([DynamicPanel, BorderContainer,_TemplatedMixin, _WidgetsInTemplateMixin], {
        _iframeTemplate: new dtl.Template('<iframe src="{{ iframeSrc }}" frameborder="0" ' +
            'style="overflow:hidden;height:{{ height }}px;width:{{ width }}px" height="{{ height }}" width="{{ width }}"></iframe>'),
        constructor: function (options) {
            declare.safeMixin(this, options);

            var widget=this;

            this.contentWidget = new (declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: hbsI18n(template, i18n),
                region: 'top',
                gutters: false,
                previewMapUrl: displayConfig.testEmbeddedMapUrl,
                url: window.location.href,
                assetUrl: ngwConfig.assetUrl
            }));
        },
        postCreate: function(){
            this.inherited(arguments);
            svg4everybody();
            this.contentWidget.mapWidthControl.on("change", lang.hitch(this, function(){
                this.setEmbedCode();
            }));
            this.contentWidget.mapHeightControl.on("change", lang.hitch(this, function(){
                this.setEmbedCode();
            }));
            this.contentWidget.linkCheckbox.on("change", lang.hitch(this, function(){
                this.setEmbedCode();
            }));
            this.contentWidget.eventsCheckbox.on("change", lang.hitch(this, function(){
                this.setEmbedCode();
            }));
            this.contentWidget.previewMapButton.on("click", lang.hitch(this, function(){
                this.contentWidget.previewMapForm.submit();
            }));
        },
        show: function () {
            this.inherited(arguments);
            this.setPermalinkUrl();
            this.setEmbedCode();
        },
        setEmbedCode: function(){
            all({
                visibleItems: this.display.getVisibleItems()
            }).then(
                lang.hitch(this, function (visibleItemsResults) {

                    var iframeSrc = Permalink.getPermalink(this.display, visibleItemsResults.visibleItems, {
                        urlWithoutParams: displayConfig.tinyDisplayUrl,
                        additionalParams: {
                            linkMainMap: this.contentWidget.linkCheckbox.get('checked'),
                            events: this.contentWidget.eventsCheckbox.get('checked'),
                        }
                    });

                    var iframeTemplateContext = {
                        iframeSrc: iframeSrc,
                        width: this.contentWidget.mapWidthControl.get('value'),
                        height: this.contentWidget.mapHeightControl.get('value')
                    };

                    this.embedCode = this._iframeTemplate.render(new dtlContext(iframeTemplateContext));
                    this.contentWidget.codeControl.set('value', this.embedCode);
                    this.contentWidget.previewMapCodeControl.value = encodeURI(this.embedCode);

                }),
                function (error) {
                    console.log(error);
                }
            );
        },
        setPermalinkUrl: function(){
            all({
                visibleItems: this.display.getVisibleItems()
            }).then(
                lang.hitch(this, function (visibleItemsResults) {
                    this.permalinkUrl = Permalink.getPermalink(this.display, visibleItemsResults.visibleItems);
                    this.contentWidget.permalinkControl.set("value", decodeURIComponent(this.permalinkUrl));
                }),
                function (error) {
                    console.log(error);
                }
            );
        }
    });
});
