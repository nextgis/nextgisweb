define([
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
    template
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
                })
            );
            this.watch(
                'message',
                lang.hitch(this, function (attr, oldVal, newVal) {
                    if (newVal !== oldVal) {
                        this._renderMessage(newVal);
                    }
                })
            );
        },

        _getMessage: function (status, version) {
            var contactSupport = i18n.gettext("<a>Contact support</a> for update.")
                .replace("<a>", '<a href="' + this.supportUrl + '" target="_blank">')

            var messages = {
                inProgress: function () { return i18n.gettext('Checking for updates...') },
                upToDate: lang.hitch(this, function () {
                    return i18n.gettext("Your {distribution} is up-to-date.")
                        .replace("{distribution}", ngwConfig.distribution.description)
                        .replace("{version}", version)
                }),
                hasUpdate: lang.hitch(this, function (version) {
                    return i18n.gettext("New version of {distribution} is available: {version}.")
                        .replace("{distribution}", ngwConfig.distribution.description)
                        .replace("{version}", version) + "<br/>" + contactSupport;
                }),
                hasUrgentUpdate: lang.hitch(this, function (version) {
                    return i18n.gettext("Critical updates are available: {version}. Please consider updating an soon as possible.")
                        .replace("{version}", version) + "<br/>" + contactSupport;
                }),
            };
            return Object.keys(messages).indexOf(status) !== -1
                ? messages[status](version)
                : '';
        },

        _renderMessage: function(message) {
            this.contentNode.innerHTML = message;
        },

        _renderDialog: function () {
            var iframe = document.createElement('iframe');
            iframe.src = this.detailsUrl;
            iframe.setAttribute('frameborder', 0);
            iframe.style.width = '100%';
            iframe.style.height = '60vh';

            this.detailsDialog = new OverlayDialog.OverlayDialog({
                content: iframe.outerHTML,
                style: 'width: 95%; max-width: 680px; min-width: 320px;',
            });
        },

        _addUpdateDetails: function () {
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
            on(this.detailsButton, 'click', lang.hitch(this, function () {
                this.detailsDialog.show();
            }));
        },

        _removeUpdateDetails: function () {
            this.actionNode.innerHTML = '';
            this.detailsDialog.destroy();
            this.detailsDialog = null;
        },

        updateStatus: function (status, oldStatus) {
            this.set('message', this._getMessage(status, this.nextVersion));
            if (oldStatus)
                domClass.remove(this.domNode, this.baseCls + '--' + oldStatus);
            domClass.add(this.domNode, this.baseCls + '--' + status);
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
