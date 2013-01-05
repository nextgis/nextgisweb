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
    // Mixin превращающий ngw/modelWidget/Widget в форму редактирования
    // модели с соответствующими кнопками и реализующий функционал сохранения
    // или добавления.

    return declare([], {

        constructor: function (params) {
            this.buttonPane = new ContentPane({style: "padding: 0"});
            this.submitUrl = params.url;

            widget = this;
            if (params.operation == 'create') {
                new Button({label: "Создать"}).placeAt(this.buttonPane)
                    .on("click", function () { widget.submit() });
            } else {
                new Button({label: "Сохранить"}).placeAt(this.buttonPane)
                    .on("click", function () { widget.submit() });
            }
        },

        startup: function () {
            this.inherited(arguments);
            this.buttonPane.placeAt(this.domNode);
        },

        submit: function () {
            var widget = this;

            // заблокируем форму на всякий случай
            this.set("disabled", true);

            var validate = function () { return { isValid: true, error: [] } };
            if (this.validateWidget) {
                var validate = function () { return widget.validateWidget() };
            };

            var d = new Deferred();

            // при любом исходе разблокируем форму
            d.then(
                function (success) { widget.set("disabled", false) },
                function (errinfo) {
                    alert("К сожалению, во время выполнения операции произошла непредвиденная ошибка. \n" +
                          "Возможно это вызвано неполадками в работе сети. Сообщение об ошибке:\n\n" + errinfo);

                    widget.set("disabled", false);
                }
            );

            // валидация формы может быть асинхронной
            when(validate(),
                function (result) {
                    if (result.isValid) {
                        // получение значения может быть асинхронным
                        when(widget.get("value"),
                            function (value) {
                                xhr.post(widget.submitUrl, {
                                    handleAs: "json",
                                    data: json.stringify(value),
                                    headers: { "Content-Type": "application/json" }
                                }).then(
                                    function (response) {
                                        if (response.status_code == 200) {
                                            d.resolve(true);
                                            window.location = response.redirect;
                                        } else if (response.status_code == 400) {
                                            d.resolve(false);
                                            widget.set("error", response.error);
                                        } else {
                                            // что-то странное с ответом
                                            d.reject();
                                        };
                                    }, 
                                    d.reject
                                );
                            }, d.reject
                        )
                    } else {
                        widget.set("error", result.error);
                        d.resolve(false);
                    };
                }, d.reject
            );

            return d;
        }
    });
});
