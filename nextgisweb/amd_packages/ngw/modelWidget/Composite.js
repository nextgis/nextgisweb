define([
    "dojo/_base/declare",
    "./Widget",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/when"
], function (
    declare,
    Widget,
    array,
    Deferred,
    all,
    when
) {
    // Виджет привязанный к модели, состоящий из других виджетов,
    // привязанных к этой же модели.

    return declare([Widget], {

        constructor: function (params) {
            this.subwidgets = {};

            var widget = this;
            array.forEach(params.subwidgets, function (sw) {
                widget.subwidgets[sw.key] = sw.module;
            })

            this.subwidget = {};
            this._subwidgets = [];

            var pSubWidgetCreated = {};

            var widget = this;
            array.forEach(Object.keys(this.subwidgets), function (k) {
                var d = new Deferred();
                pSubWidgetCreated[k] = d;
                require([widget.subwidgets[k]], function (WM) {
                    var w = new WM(params[k]);
                    w.__composite_key = k;

                    widget.subwidget[k] = w;
                    widget._subwidgets.push(w);

                    d.resolve(w);
                });
            });

            this._pAllSubwidgetsCreated = all(pSubWidgetCreated);
        },

        startup: function () {
            this.inherited(arguments);

            var widget = this;
            this._pAllSubwidgetsCreated.then(function (data) {
                array.forEach(Object.keys(data), function (k) {
                    var w = data[k];
                    if (widget.placeWidget) {
                        widget.placeWidget(k, w);
                    } else {
                        w.placeAt(widget.domNode);
                    };
                    w.startup();
                });
            });
        },

        _getValueAttr: function () {
            // В общем случае значение любого виджета внутри может
            // быть обещанием его вернуть, поэтому собираем обещания
            // и возвращаем общее.

            var promises = {};

            var widget = this;
            array.forEach(Object.keys(this.subwidget), function(key) {
                var subw = widget.subwidget[key];
                var subwPromise = new Deferred();

                promises[key] = subwPromise;
                when(subw.get("value"), subwPromise.resolve, subwPromise.reject);
            });

            return all(promises);
        },

        // Асинхронная проверка данных виджета, имя выбрано специально,
        // чтобы не пересекалось со стандартным validate
        validateWidget: function () {
            var promises = {};

            var widget = this;
            array.forEach(Object.keys(this.subwidget), function (key) {
                var subw = widget.subwidget[key];
                if (subw.validateWidget) {
                    var subwPromise = new Deferred();
                    promises[key] = subwPromise;

                    when(subw.validateWidget(),
                        subwPromise.resolve,
                        subwPromise.reject
                    );
                };
            });

            var promise = new Deferred();

            all(promises).then(
                function (data) {
                    var result = { isValid: true, error: {} };

                    array.forEach(Object.keys(data), function(wkey) {
                        result.isValid = result.isValid && data[wkey].isValid;
                        result.error[wkey] = data[wkey].error;
                    });

                    console.log(result);
                    promise.resolve(result);
                },
                promise.reject
            );

            return promise;
        },

        _setErrorAttr: function (value) {
            var widget = this;
            array.forEach(Object.keys(this.subwidget), function (key) {
                var subw = widget.subwidget[key];
                subw.set("error", value[key]);
            });
        },

        _setDisabledAttr: function (value) {
            this.inherited(arguments);
            var widget = this;
            array.forEach(Object.keys(this.subwidget), function (k) {
                widget.subwidget[k].set("disabled", value);
            });            
        }

    });
});