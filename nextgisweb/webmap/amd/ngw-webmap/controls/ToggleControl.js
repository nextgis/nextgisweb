define([
    'dojo/_base/declare',
    "dojo/on",
    "dojo/dom-construct",
    'dijit/form/ToggleButton'
], function (
    declare,
    on,
    domConstruct,
    ToggleButton
) {
    return declare(ToggleButton, {
        content: "content",
        constructor: function(options){
            this.inherited(arguments);
            declare.safeMixin(this,options);
        },
        postCreate: function(){
            if (this.tool.customIcon){
                domConstruct.destroy(this.iconNode);
                this.iconNode = domConstruct.toDom(this.tool.customIcon);
                this.titleNode.appendChild(this.iconNode);
            }
        }
    });
});
