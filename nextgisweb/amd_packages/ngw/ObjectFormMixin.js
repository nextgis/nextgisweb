define([
    "dojo/_base/declare",
    "dojo/_base/Deferred",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/when",
    "dijit/layout/ContentPane",
    "dijit/form/Button"
], function (
    declare,
    Deferred,
    xhr,
    json,
    when,
    ContentPane,
    Button
) {
    return declare("ngw.ObjectFormMixin", [], {

        constructor: function (params) {
            this.buttonPane = new ContentPane({style: "padding: 0"});
            this.submitUrl = params.url;

            widget = this;
            var btnCreate = new Button({label: "Добавить"}).placeAt(this.buttonPane)
                .on("click", function () { widget.submit() });
        },

        startup: function () {
            this.inherited(arguments);
            this.buttonPane.placeAt(this.domNode);
        },

        submit: function () {
            var widget = this;

            // заблокируем форму на всякий случай
            this.set("disabled", true);

            var validate = function () { return true };
            if (this.validate) {
                var validate = function () { return widget.validate() };
            };

            var d = new Deferred();

            // при любом исходе разблокируем форму
            d.then(
                function () { widget.set("disabled", false) },
                function () { widget.set("disabled", false) }
            );

            // валидация формы может быть асинхронной
            when(validate(),
                function (isValid) {
                    if (isValid) {
                        // получение значения может быть асинхронным
                        when(widget.get("value"),
                            function (value) {
                                xhr.post(widget.submitUrl, {
                                    handleAs: "json",
                                    data: json.stringify(value),
                                    headers: { "Content-Type": "application/json" }
                                }).then(
                                    function (response) {
                                        d.resolve(response);
                                        // TODO: может потребоваться что-то более полезное чем редирект
                                        window.location = response.url;
                                    }, 
                                    function (error) {
                                        alert(error);
                                        d.reject(error);
                                    }
                                );
                            }, d.reject
                        )
                    } else {
                        alert("Не удалось выполнить действие, так как форма содержит ошибки.");
                        d.reject();
                    };
                }, d.reject
            );

            return d;
        }
    });
});
