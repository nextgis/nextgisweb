define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/Stateful',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    'dojo/query',
    'dojo/dom-construct',
    'dijit/_TemplatedMixin',
    'dijit/layout/ContentPane',
    'dojo/text!./NavigationMenu.hbs',
    'dijit/layout/BorderContainer',
    'xstyle/css!./NavigationMenu.css'
], function (
    declare,
    lang,
    array,
    Stateful,
    i18n,
    hbsI18n,
    query,
    domConstruct,
    _TemplatedMixin,
    ContentPane,
    template
) {
    return declare([Stateful, ContentPane, _TemplatedMixin], {
        templateString: hbsI18n(template, i18n),
        items: [],
        value: undefined, //selected item

        /**
         * Constructor of NavigationMenu.
         * @param {Object} options - NavigationMenu options.
         * @param {Object[]} options.items - Array of menu items, [{name: "", title: "", icon: "", value: ""}].
         */
        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        postCreate: function () {
            this._renderAll();
        },

        _renderAll: function () {
            array.forEach(this.items, function (item) {
                this._renderItem(item);
            }, this);
        },

        /**
         * Add new menu item to the menu.
         * @param {Object} item - Menu item {name: "", title: "", icon: "", value: ""}.
         */
        addItem: function (item) {
            this._addItem(item);
            this._renderItem(item);
        },

        _addItem: function (item) {
            this.items.push(item);
        },

        _renderItem: function (item) {
            var widget = this,
                itemActiveClass = (this.value === item.value) ? 'active' : '';

            item.el = domConstruct.create('div', {
                innerHTML: '<span class="navigation-menu__icon material-icons">' + item.icon + '</span>',
                className: 'navigation-menu__item ' + itemActiveClass,
                title: item.title,
                onclick: function (e) {
                    if (widget.value === item.value)
                        widget.reset();
                    else
                        widget.activateItem(item.value, this);
                }
            }, this.domNode);

            item.el.setAttribute('data-item-value', item.value);
        },

        activateItem: function (value, node) {
            if (this.value) this.reset();
            this.set('value', value);
            query(node).addClass('active');
        },

        reset: function () {
            this.set('value', undefined);
            query('.active', this.domNode).removeClass('active');
        }
    });
});
