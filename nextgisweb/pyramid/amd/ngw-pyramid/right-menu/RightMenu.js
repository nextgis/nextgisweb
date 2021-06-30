define([
    'dojo/_base/declare',
    '@nextgisweb/pyramid/i18n!',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetBase',
    'dijit/_WidgetsInTemplateMixin',
    'ngw-pyramid/dynamic-panel/DynamicPanel',
    'dojo/dom-construct',
    'dojo/_base/array',
    'dojo/on',
    'xstyle/css!./RightMenu.css',
], function (
    declare,
    i18n,
    _TemplatedMixin,
    _WidgetBase,
    _WidgetsInTemplateMixin,
    DynamicPanel,
    domConstruct,
    array,
    on,
) {
    return declare([DynamicPanel], {
        items: [],
        constructor: function (options) {
            declare.safeMixin(this, options);

            var widget = this;

            this.contentWidget = new (declare([_WidgetBase], {
                buildRendering: function () {
                    if (widget.items.length) {
                        this.domNode = domConstruct.create('div', {
                            class: 'list',
                        });
                        array.forEach(
                            widget.items,
                            function (item) {
                                domConstruct.create(
                                    'a',
                                    {
                                        class: 'list__item list__item--link',
                                        innerHTML: item.text,
                                        href: item.link,
                                    },
                                    this.domNode,
                                );
                            },
                            this,
                        );
                    }
                },
            }))();
        },
        postCreate: function () {
            this.inherited(arguments);

            var widget = this;

            on(document.getElementById('rightMenuIcon'), 'click', function () {
                widget.show();
            });
        },
    });
});
