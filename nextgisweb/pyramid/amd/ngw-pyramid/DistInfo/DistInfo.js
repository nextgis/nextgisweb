const distInfoMessages = define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/Stateful',
    '@nextgisweb/pyramid/i18n!',
    'dojo/on',
    'ngw-pyramid/NGWButton/NGWButton',
    '@nextgisweb/pyramid/OverlayDialog',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/text!./DistInfo.hbs',
    'xstyle/css!./DistInfo.css',
], function (
    declare,
    lang,
    domClass,
    Stateful,
    i18n,
    on,
    NGWButton,
    OverlayDialog,
    _WidgetBase,
    _TemplatedMixin,
    template,
) {
    return declare([Stateful, _WidgetBase, _TemplatedMixin], {
        templateString: i18n.renderTemplate(template),
        status: 'inProgress',
        message: undefined, //selected item
        currentVersion: undefined,
        nextVersion: undefined,
        baseCls: 'dist-info',
        detailsButton: undefined,
        detailsUrl: undefined,
        detailsDialog: undefined,
        supportUrl: undefined,
        /**
         * Constructor of DistInfo.
         *
         * @param {Object[]} options.status - the status of the distribution package: ‘inProgress’ || ‘hasUpdate’ || ‘needUrgentUpdate’|| ‘upToDate’
         */
        constructor: function (options) {
            declare.safeMixin(this, options);
            this.message = this._getMessage(this.status, this.nextVersion);
        },

        postCreate: function () {
            this.watch(
                'status',
                lang.hitch(this, function (attr, oldVal, newVal) {
                    if (newVal !== oldVal) {
                        this.updateStatus(newVal, oldVal);
                    }
                }),
            );
            this.watch(
                'message',
                lang.hitch(this, function (attr, oldVal, newVal) {
                    if (newVal !== oldVal) {
                        this._renderMessage(newVal);
                    }
                }),
            );
        },

        _getMessage(status, version) {
            const messages = {
                inProgress: () => i18n.gettext('Checking for updates...'),
                upToDate: () => {
                    return `Your NextGIS Web is up-to-date: ${this.currentVersion}`;
                },
                hasUpdate: (version) => {
                    return (
                        i18n.gettext(
                            'New version of NextGIS Web is available',
                        ) +
                        ': ' +
                        version +
                        '<br/> <a href="' +
                        this.supportUrl +
                        '" target="_blank">' +
                        i18n.gettext('Contact support</a> for update.')
                    );
                },
                hasUrgentUpdate: (version) => {
                    const message =
                        i18n.gettext('Critical updates are available') +
                        `: ${version}. ` +
                        i18n.gettext(
                            'Please consider updating as&nbsp;soon as&nbsp;possible.',
                        ) +
                        `<br/> <a href="${this.supportUrl}" target="_blank">` +
                        i18n.gettext('Contact support</a> for update.');
                    return message;
                },
            };
            return Object.keys(messages).indexOf(status) !== -1
                ? messages[status](version)
                : '';
        },
        _renderMessage(message) {
            this.contentNode.innerHTML = message;
        },
        _renderDialog() {
            let iframe = document.createElement('iframe');
            iframe.src = this.detailsUrl;
            iframe.setAttribute('frameborder', 0);
            iframe.style.width = '100%';
            iframe.style.height = '60vh';

            this.detailsDialog = new OverlayDialog.OverlayDialog({
                content: iframe.outerHTML,
                style: 'width: 95%; max-width: 680px; min-width: 320px;',
            });
        },
        _addUpdateDetails() {
            if (!this.detailsButton) {
                this.detailsButton = new NGWButton({
                    size: 'small',
                    label: i18n.gettext('Show details'),
                    type: 'outlined',
                    color: 'secondary',
                });
            }
            this.detailsButton.placeAt(this.actionNode);
            if (!this.detailsDialog && this.detailsUrl) {
                this._renderDialog();
            }
            on(this.detailsButton, 'click', () => {
                this.detailsDialog.show();
            });
        },
        _removeUpdateDetails() {
            this.actionNode.innerHTML = '';
            this.detailsDialog.destroy();
            this.detailsDialog = null;
        },
        updateStatus(status, oldStatus) {
            this.set('message', this._getMessage(status, this.nextVersion));
            if (oldStatus)
                domClass.remove(this.domNode, `${this.baseCls}--${oldStatus}`);
            domClass.add(this.domNode, `${this.baseCls}--${status}`);
            if (status === 'hasUpdate' || status === 'hasUrgentUpdate') {
                this._addUpdateDetails();
            } else if (
                oldStatus == 'hasUpdate' ||
                oldStatus === 'hasUrgentUpdate'
            ) {
                this._removeUpdateDetails();
            }
        },
    });
});
