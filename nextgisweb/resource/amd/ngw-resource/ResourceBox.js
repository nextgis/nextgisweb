/* globals console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "ngw-pyramid/form/PickerBox",
    "./ResourcePicker"
], function (declare,
             lang,
             PickerBox,
             ResourcePicker) {
    return declare([PickerBox], {
        buildRendering: function () {
            this.inherited(arguments);
            this.picker = new ResourcePicker({cls: this.cls, interface: this.interface});
            this.store = this.picker.tree.store;
        },

        getLabel: function (value) {
            if (value === null) return "";

            return this.store.get(value.id).then(function (data) {
                return data.resource.display_name;
            });
        },

        _buttonClick: function () {
            this.inherited(arguments);
            this.picker.pick().then(lang.hitch(this, function (itm) {
                this.set("value", {id: itm.id});
                this.emit("picked", {
                    resource: itm
                });
            }));
        }
    });
});
