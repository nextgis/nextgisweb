define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojox/form/CheckedMultiSelect",
    "ngw/route",
    // css
    "xstyle/css!" + ngwConfig.amdUrl + 'dojox/form/resources/CheckedMultiSelect.css'
], function (
    declare,
    lang,
    domConstruct,
    CheckedMultiSelect,
    route
) {
    return declare([CheckedMultiSelect], {
        onAfterAddOptionItem: function (item, option) {
            item.labelNode.style.display = "none";
            domConstruct.place(
                domConstruct.create("a", {
                    href: lang.getObject(this.route, false, route)(option.value),
                    innerHTML: option.label,
                    target: "_blank",
                    classname: "dojoxCheckedMultiSelectItemLabel"
                }), item.domNode);
        }
    });
});
