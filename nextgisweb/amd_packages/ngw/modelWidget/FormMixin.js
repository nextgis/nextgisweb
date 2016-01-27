define([
    "dojo/_base/declare",
    "dojo/_base/Deferred",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/when",
    "dojo/dom-construct",
    "dijit/layout/ContentPane",
    "dijit/form/Button"
], function (
    declare,
    Deferred,
    xhr,
    json,
    when,
    domConstruct,
    ContentPane,
    Button
) {
    // Mixin превращающий ngw/modelWidget/Widget в форму редактирования
    // модели с соответствующими кнопками и реализующий функционал сохранения
    // или добавления.

    return declare([], {

        constructor: function (params) {
            this.buttonPane = new ContentPane({style: "padding: 10px 0 0;"});
            this.submitUrl = params.url;

            widget = this;

            if (params.operation == 'create') {
                this.btn = new Button({label: "Создать", iconClass: "dijitIconNewTask"});
            } else if (params.operation == 'edit') {
                this.btn = new Button({label: "Сохранить", iconClass: "dijitIconSave"});
            } else if (params.operation == 'delete') {
                this.btn = new Button({label: "Удалить", iconClass: "dijitIconDelete"});
            };

            this.btn.placeAt(this.buttonPane).on("click", function () { widget.submit() });
        },

        postCreate: function () { 
            // Создаем дополнительный div, в который будут
            // попадать дочерние виджеты
            this.containerNode = domConstruct.create('div', null, this.domNode);

            // Вызываем базовый класс после, мало ли кто там
            // тоже захочит разместить дочерний виджет
            this.inherited(arguments);
        },

        addChild: function (child) {
            if (child == this.buttonPane) {
                // Панель с кнопками добавляем в корень
                child.placeAt(this.domNode);
            } else {
                // Все остальное добавляем в спец. контейнер
                child.placeAt(this.containerNode);
            };
        },

        startup: function () {
            this.inherited(arguments);
            this.buttonPane.placeAt(this);
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
                function (success) { if (!success) { widget.set("disabled", false)} },
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
        },

        _setDisabledAttr: function (value) {
            this.inherited(arguments);
            this.btn.set('disabled', value);
        }
    });
});
