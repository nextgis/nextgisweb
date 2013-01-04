define([
    "dojo/_base/declare",
    "ngw/ObjectWidget",
    "dojo/_base/array",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/when"
], function (
    declare,
    ObjectWidget,
    array,
    Deferred,
    all,
    when
) {
    return declare("ngw.CompositeWidget", [ObjectWidget], {

        constructor: function (params) {
            this.subwidgets = {};

            var widget = this;
            array.forEach(params.subwidgets, function (sw) {
                widget.subwidgets[sw.key] = sw.module;
            })

            this.subwidget = {};

            var pSubWidgetCreated = {};

            var widget = this;
            array.forEach(Object.keys(this.subwidgets), function (k) {
                var d = new Deferred();
                pSubWidgetCreated[k] = d;
                require([widget.subwidgets[k]], function (WM) {
                    var w = new WM(params[k]);
                    widget.subwidget[k] = w;
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


        validate: function () {
            // Аналогично _getValueAttr проверка может быть асинхронной

            var promises = [];

            var widget = this;
            array.forEach(Object.keys(this.subwidget), function (key) {
                var subw = widget.subwidget[key];
                if (subw.validate) {
                    var subwPromise = new Deferred();
                    promises.push(subwPromise);

                    when(subw.validate(),
                        subwPromise.resolve,
                        subwPromise.reject
                    );
                };
            });

            var promise = new Deferred();

            all(promises).then(
                function (data) {

                    var f = true;
                    array.forEach(data, function(wf) { f = f && wf });
                    promise.resolve(f);
                },
                promise.reject
            );

            return promise;
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