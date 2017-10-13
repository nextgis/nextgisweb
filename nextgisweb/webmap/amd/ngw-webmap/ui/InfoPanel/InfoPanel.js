define([
    'dojo/_base/declare',
    'ngw-pyramid/i18n!webmap',
    'ngw-pyramid/hbs-i18n',
    "dijit/_TemplatedMixin",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "dijit/layout/BorderContainer",
    "dojo/dom-construct",

    //templates
    "xstyle/css!./InfoPanel.css"
], function (
    declare,
    i18n,
    hbsI18n,
    _TemplatedMixin,
    DynamicPanel,
    BorderContainer,
    domConstruct) {
    return declare([DynamicPanel, BorderContainer,_TemplatedMixin], {
        postCreate: function(){
            this.inherited(arguments);

            this.descriptionPane = domConstruct.create("div",{
                class:"info-panel__description",
                innerHTML: this.description
            });

            domConstruct.place(this.descriptionPane, this.contentNode)
        }
    });
});