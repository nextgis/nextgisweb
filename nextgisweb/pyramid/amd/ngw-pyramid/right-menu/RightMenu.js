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
    '@nextgisweb/pyramid/update',
    '@nextgisweb/pyramid/api',
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
    update,
    api,
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

            // subscribe to update checker
            update.registerCallback((data) => {
                if (ngwConfig.isAdministrator) {
                    const distStatus =
                        data.distribution && data.distribution.status;
                    const rightMenuNotifyEl = document.querySelector(
                        '.rightMenu-notify',
                    );
                    const sysInfoURL = api.routeURL(
                        'pyramid.control_panel.sysinfo',
                    );

                    if (
                        distStatus === 'has_update' ||
                        distStatus === 'has_urgent_update'
                    ) {
                        const itemColor =
                            distStatus === 'has_urgent_update'
                                ? 'danger'
                                : 'success';
                        const sidebarItemText =
                            distStatus === 'has_urgent_update'
                                ? i18n.gettext('Critical updates are available')
                                : i18n.gettext('Updates are available');
                        const sidebarItem = domConstruct.create(
                            'a',
                            {
                                class: `list__item list__item--link list__item--${itemColor}`,
                                innerHTML:
                                    `<div>${sidebarItemText}<br/> <span class="text-muted small-text">` +
                                    i18n.gettext("Click to see what's new") +
                                    '</span></div>',
                                href: sysInfoURL,
                            },
                            this.domNode,
                        );
                        this.contentWidget.domNode.prepend(sidebarItem);
                        if (distStatus === 'has_urgent_update') {
                            rightMenuNotifyEl.classList.add(
                                'rightMenu-notify--danger',
                            );
                        } else {
                            rightMenuNotifyEl.classList.remove(
                                'rightMenu-notify--danger',
                            );
                        }
                        rightMenuNotifyEl.style.display = 'block';
                    } else {
                        rightMenuNotifyEl.style.display = 'none';
                    }
                }
            });
        },
    });
});
