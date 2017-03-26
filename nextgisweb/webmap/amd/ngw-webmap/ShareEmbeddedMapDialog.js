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
    'dijit/form/CheckBox',
    'dojox/layout/TableContainer',
    'ngw/utils/make-singleton',
    'openlayers/ol',
    'ngw-webmap/Permalink',
    'ngw-pyramid/i18n!webmap'
], function (declare, array, lang, on, domConstruct, ioQuery, all, dtl, dtlContext,
             Dialog, Button, TextBox, SimpleTextarea, NumberTextBox, CheckBox,
             TableContainer, MakeSingleton, ol, Permalink, i18n) {
    return MakeSingleton(declare('ngw-webmap.ShareEmbeddedMapDialog', [], {
        constructor: function (Display) {
            this.display = Display;
        },

        _visibleItems: null,
        _widthTextBox: null,
        _heightTextBox: null,
        _iframeTextarea: null,

        show: function () {
            all({
                visbleItems: this.display.getVisibleItems(),
                map: this.display._mapDeferred
            }).then(
                lang.hitch(this, function (gettingVisibleItemsResults) {
                    this._visibleItems = gettingVisibleItemsResults.visbleItems;
                    this._showDialog();
                }),
                function (error) {
                    console.log(error);
                }
            );
        },

        _updateIframeTextarea: function () {
            this._iframeTextarea.set('value', this._getIframeHtml());
        },

        _iframeTemplate: new dtl.Template('<iframe src="{{ iframeSrc }}" frameborder="0" ' +
            'style="overflow:hidden;height:{{ height }};width:{{ width }}" height="{{ height }}" width="{{ width }}"></iframe>'),

        _getIframeHtml: function () {
            var iframeTemplateContext = {
                iframeSrc: this._getIframeSrc(),
                width: this._widthTextBox.get('value'),
                height: this._heightTextBox.get('value')
            };

            return this._iframeTemplate.render(new dtlContext(iframeTemplateContext));
        },

        _getIframeSrc: function () {
            return Permalink.getPermalink(this.display, this._visibleItems, {
                urlWithoutParams: displayConfig.tinyDisplayUrl,
                additionalParams: {
                    linkMainMap: this._linkChb.get('checked')
                }
            });
        },

        _showDialog: function () {
            var embeddMapDialog, tableContainer, previewBtn;

            embeddMapDialog = new Dialog({
                title: i18n.gettext('Embedded map settings'),
                draggable: false,
                autofocus: false,
                onHide: function () {
                    embeddMapDialog.destroy();
                }
            });

            this._widthTextBox = new TextBox({
                name: 'width',
                label: i18n.gettext('Width'),
                intermediateChanges: true,
                value: '500px',
                style: {width: '200px'}
            });


            this._heightTextBox = new TextBox({
                name: 'height',
                label: i18n.gettext('Height'),
                intermediateChanges: true,
                value: '500px',
                style: {width: '200px'}
            });

            this._linkChb = new CheckBox({
                label: i18n.gettext('Link to main map'),
                checked: true,
                style: {
                    width: '15px',
                    height: '15px'
                }
            });

            this._iframeTextarea = new SimpleTextarea({
                label: i18n.gettext('HTML code'),
                readOnly: false,
                selectOnClick: true,
                rows: 3,
                value: this._getIframeHtml(),
                style: {
                    width: '200px',
                    height: '70px'
                }
            });

            tableContainer = new TableContainer({
                cols: 1,
                customClass: 'labelsAndValues',
                labelWidth: '150'
            });
            tableContainer.addChild(this._widthTextBox);
            tableContainer.addChild(this._heightTextBox);
            tableContainer.addChild(this._iframeTextarea);
            tableContainer.addChild(this._linkChb);

            domConstruct.place(
                tableContainer.domNode,
                embeddMapDialog.containerNode,
                'first'
            );

            tableContainer.startup();

            previewBtn = new Button({
                label: i18n.gettext('Preview'),
                onClick: lang.hitch(this, function () {
                    var innerHtml, form;
                    innerHtml = '<input type="hidden" name="iframe" value="' + encodeURI(this._getIframeHtml()) + '" />';
                    form = domConstruct.create('form', {
                        id: 'testEmbeddedMapForm',
                        innerHTML: innerHtml,
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
            on(this._linkChb, 'change', lang.hitch(this, function () {
                this._updateIframeTextarea();
            }));

            embeddMapDialog.show();
        }
    }));
});
