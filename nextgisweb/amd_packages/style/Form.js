define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Form.html",
    "dojo/request/xhr",
    "dojo/json",
    // template widgets
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/Toolbar",
    "dijit/form/Button"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    xhr,
    json
) {
    return declare("style.Form", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,

        postCreate: function () {
            var form = this;

            require(["style/Widget", this.widgetModule], function (BaseWidget, Widget) {
                form.baseWidget = new BaseWidget({data: form.data, config: form.config}).placeAt(form.contentPane);
                form.widget = new Widget({data: form.data, config: form.config}).placeAt(form.contentPane);
            });

            this.saveButton.on("click", function () {
                form.save();
            })
        },

        save: function () {
            var reqData = {cls: this.widget.identity};
            reqData[this.baseWidget.identity] = this.baseWidget.getIData();
            reqData[this.widget.identity] = this.widget.getIData();

            var form = this; 

            if (this.create) {
                xhr.post(application_url + '/api/layer/' + this.config.style.layer_id + '/style/', {
                    handleAs: "json",
                    data: json.stringify(reqData)
                }).then(
                    function (data) {
                        window.location = application_url + "/layer/" + form.config.style.layer_id + "/style/" + data.id;
                    }
                );
            } else { 
                xhr.put(application_url + "/api/layer/" + this.config.style.layer_id + "/style/" + this.data.style.id, {
                    handleAs: 'json',
                    data: json.stringify(reqData)
                });
            };
        }
    });
})