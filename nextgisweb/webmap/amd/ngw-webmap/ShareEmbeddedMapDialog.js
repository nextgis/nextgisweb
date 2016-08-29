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
    'ngw-webmap/Permalink',
    'ngw-pyramid/i18n!webmap'
], function (declare, array, lang, on, domConstruct, ioQuery, all, dtl, dtlContext,
             Dialog, Button, TextBox, SimpleTextarea, NumberTextBox,
             TableContainer, MakeSingleton, ol, Permalink, i18n) {
    return MakeSingleton(declare('ngw-webmap.ShareEmbeddedMapDialog', [], {
        constructor: function (Display) {
            this.display = Display;
        },

        _iframeSrc: null,
        show: function () {
            all({
                visbleItems: this.display.getVisibleItems(),
                map: this.display._mapDeferred
            }).then(
                lang.hitch(this, function (gettingVisibleItemsResults) {
                    this._iframeSrc = Permalink.getPermalink(this.display, gettingVisibleItemsResults.visbleItems, {
                        urlWithoutParams: displayConfig.tinyDisplayUrl
                    });
                    this._showDialog();
                }),
                function (error) {
                    console.log(error);
                }
            );
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

        _showDialog: function () {
            var embeddMapDialog, tableContainer, previewBtn;

            embeddMapDialog = new Dialog({
                title: i18n.gettext('ShareEmbeddedMap'),
                draggable: false,
                autofocus: false,
                onHide: function () {
                    embeddMapDialog.destroy();
                }
            });

            this._widthTextBox = new TextBox({
                name: 'width',
                label: 'Width',
                intermediateChanges: true,
                value: '500px',
                style: {width: '200px'}
            });


            this._heightTextBox = new TextBox({
                name: 'height',
                label: 'Height',
                intermediateChanges: true,
                value: '500px',
                style: {width: '200px'}
            });


            this._iframeTextarea = new SimpleTextarea({
                label: 'Output HTML',
                readOnly: false,
                selectOnClick: true,
                rows: 3,
                value: this._getIframeHtml(),
                style: {
                    width: '200px',
                    height: '70px'
                }
            });

            tableContainer = new dojox.layout.TableContainer({
                cols: 1,
                customClass: 'labelsAndValues',
                labelWidth: '150'
            });
            tableContainer.addChild(this._widthTextBox);
            tableContainer.addChild(this._heightTextBox);
            tableContainer.addChild(this._iframeTextarea);

            domConstruct.place(
                tableContainer.domNode,
                embeddMapDialog.containerNode,
                'first'
            );

            tableContainer.startup();

            previewBtn = new Button({
                label: 'Preview',
                onClick: lang.hitch(this, function () {
                    var form = domConstruct.create('form', {
                        id: 'testEmbeddedMapForm',
                        innerHTML: '<input type="hidden" name="iframe" value="' + encodeURI(this._getIframeHtml()) + '" />',
                        action: displayConfig.testEmbeddedMapUrl,
                        method: 'POST',
                        target: '_blank'
                    }, embeddMapDialog.containerNode);
                    form.submit();
                })
            });

            domConstruct.place(
                previewBtn.domNode,
                embeddMapDialog.containerNode,
                'last'
            );

            previewBtn.startup();

            on(this._widthTextBox, 'change', lang.hitch(this, function () {
                this._updateIframeTextarea();
            }));
            on(this._heightTextBox, 'change', lang.hitch(this, function () {
                this._updateIframeTextarea();
            }));

            embeddMapDialog.show();
        }
    }));
});
