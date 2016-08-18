define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/io-query',
    'dojo/promise/all',
    'dojox/dtl/_base',
    'dojox/dtl/Context',
    'dijit/Dialog',
    'dijit/form/Button',
    'dijit/form/TextBox',
    'dijit/form/SimpleTextarea',
    'dijit/form/NumberTextBox',
    'dojox/layout/TableContainer',
    'ngw/utils/make-singleton',
    'openlayers/ol',
    'ngw-pyramid/i18n!webmap'
], function (declare, array, lang, on, domConstruct, ioQuery, all, dtl, dtlContext,
             Dialog, Button, TextBox, SimpleTextarea, NumberTextBox,
             TableContainer, MakeSingleton, ol, i18n) {
    return MakeSingleton(declare('ngw-webmap.ShareEmbeddedMapDialog', [], {
        constructor: function (Display) {
            this.display = Display;
        },

        showEmbeddedCode: function () {
            all({
                visbleItems: this.display.getVisibleItems(),
                map: this.display._mapDeferred
            }).then(
                lang.hitch(this, function (gettingVisibleItemsResults) {
                    this._showPermalink(gettingVisibleItemsResults.visbleItems);
                }),
                function (error) {
                    console.log(error);
                }
            );
        },

        _iframeSrc: null,
        _showPermalink: function (visbleItems) {
            this._iframeSrc = this._getIframeSrc(visbleItems);
            this._showPermalinkDialog();
        },

        _getIframeSrc: function (visbleItems) {
            var visibleStyles, center, queryStr;

            visibleStyles = array.map(
                visbleItems,
                lang.hitch(this, function (i) {
                    return this.display.itemStore.dumpItem(i).styleId;
                })
            );

            center = ol.proj.toLonLat(this.display.map.olMap.getView().getCenter());

            queryStr = ioQuery.objectToQuery({
                base: this.display._baseLayer.name,
                lon: center[0].toFixed(4),
                lat: center[1].toFixed(4),
                angle: this.display.map.olMap.getView().getRotation(),
                zoom: this.display.map.olMap.getView().getZoom(),
                styles: visibleStyles.join(',')
            });

            return displayConfig.tinyDisplayUrl + '?' + queryStr;
        },

        _iframeTemplate: new dtl.Template('<iframe src="{{ iframeSrc }}" frameborder="0" ' +
            'style="overflow:hidden;height:{{ height }};width:{{ width }}" height="{{ height }}" width="{{ width }}"></iframe>'),

        _getEmbeddedIframe: function (context) {
            var contextObj = new dtlContext(context);
            return compiledTemplate = this._iframeTemplate.render(contextObj);
        },

        _widthTextBox: null,
        _heightTextBox: null,
        _iframeTextarea: null,


        _getIframeHtml: function () {
            var iframeTemplateContext = {
                iframeSrc: this._iframeSrc,
                width: this._widthTextBox.get('value'),
                height: this._heightTextBox.get('value')
            };
            return this._getEmbeddedIframe(iframeTemplateContext)
        },

        _updateIframeTextarea: function () {
            this._iframeTextarea.set('value', this._getIframeHtml());
        },

        _showPermalinkDialog: function () {
            var permalinkDialog, permalinkContent,
                embedCode, copyBtn;

            permalinkDialog = new Dialog({
                title: i18n.gettext('ShareEmbeddedMap'),
                draggable: false,
                autofocus: false,
                onHide: function () {
                    permalinkDialog.destroy();
                }
            });

            this._widthTextBox = new TextBox({
                name: "width",
                label: 'Width',
                intermediateChanges: true,
                value: "500px",
                style: {width: '200px'}
            });


            this._heightTextBox = new TextBox({
                name: "height",
                label: 'Height',
                intermediateChanges: true,
                value: "500px",
                style: {width: '200px'}
            });


            this._iframeTextarea = new SimpleTextarea({
                label: "Output HTML",
                readOnly: false,
                selectOnClick: true,
                rows: 3,
                value: this._getIframeHtml(),
                style: {
                    width: '200px',
                    height: '70px'
                }
            });

            var programmatic = new dojox.layout.TableContainer({
                cols: 1,
                customClass: "labelsAndValues",
                labelWidth: "150"
            });
            programmatic.addChild(this._widthTextBox);
            programmatic.addChild(this._heightTextBox);
            programmatic.addChild(this._iframeTextarea);

            domConstruct.place(
                programmatic.domNode,
                permalinkDialog.containerNode,
                'first'
            );

            copyBtn = new Button({
                label: 'Preview',
                onClick: lang.hitch(this, function () {
                    var form = domConstruct.create('form', {
                        id: 'testEmbeddedMapForm',
                        innerHTML: '<input type="hidden" name="iframe" value="' + encodeURI(this._getIframeHtml()) + '" />',
                        action: displayConfig.testEmbeddedMapUrl,
                        method: 'POST',
                        target: "_blank"
                    }, permalinkDialog.containerNode);
                    form.submit();
                })
            });

            domConstruct.place(
                copyBtn.domNode,
                permalinkDialog.containerNode,
                'last'
            );

            copyBtn.startup();

            //permalinkContent.startup();
            programmatic.startup();

            on(this._widthTextBox, "change", lang.hitch(this, function () {
                this._updateIframeTextarea();
            }));
            on(this._heightTextBox, "change", lang.hitch(this, function () {
                this._updateIframeTextarea();
            }));
            permalinkDialog.show();
        }
    }));
});
