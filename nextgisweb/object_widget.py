# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import inspect


class ValidationError(Exception):
    def __init__(self, message):
        self.message = message


class ObjectWidget(object):

    def __init__(self, obj=None, operation=None, options=None):
        if not obj and not operation:
            operation = 'create'
        elif not operation:
            operation = 'edit'

        self.__validate_flag = False
        self.__obj_bind_flag = (obj is not None)
        self.__data_bind_flag = False

        self.obj = obj
        self.operation = operation
        self.options = options

    def is_applicable(self):
        return True

    def __del__(self):
        pass

    def bind(self, obj=None, data=None, request=None):
        if obj is not None:
            assert not self.__obj_bind_flag
            self.obj = obj
            self.__obj_bind_flag = True

        if data is not None:
            assert not self.__data_bind_flag
            self.data = data
            self.__data_bind_flag = True

        if request:
            self.request = request

    def validate(self):
        # Валидация должна выполняться один раз
        assert not self.__validate_flag
        self.__validate_flag = True

        self.error = None
        return True

    def populate_obj(self):
        # Только после validate() и bind(data=data)
        assert self.__validate_flag and self.__obj_bind_flag

    def widget_module(self):
        pass

    def widget_params(self):
        return dict(
            operation=self.operation,
        )

    def widget_error(self):
        # Ошибки могут быть только после валидации
        assert self.__validate_flag

        return self.error


class CompositeWidget(ObjectWidget):
    subwidget_config = None
    model_class = None

    def __init__(self, obj=None, operation=None, options=None):
        ObjectWidget.__init__(self, obj=obj, operation=operation, options=options)

        # Если у класса не установлен аттрибут subwidget_config,
        # то вычислим его исходя из model_class, если он есть.
        if not self.subwidget_config and self.model_class:
            self.subwidget_config = self.scan_model(self.model_class)

        subwidgets = []
        for k, cls in self.subwidget_config:
            instance = cls(obj=obj, operation=operation, options=options)
            if instance.is_applicable():
                subwidgets.append((k, instance))

        self.subwidgets = tuple(subwidgets)

    @classmethod
    def scan_model(cls, model_cls, attr='object_widget'):
        result = []

        # Пробегаем по все предкам класса model_cls
        for model_cls in model_cls.__mro__:

            # Проверяем наличие атрибута attr у класса
            if hasattr(model_cls, attr):
                val = getattr(model_cls, attr)

                if inspect.isclass(val) and issubclass(val, ObjectWidget):
                    result.append((model_cls.identity, val))
                else:
                    tmp = list(val)
                    tmp.reverse()
                    result.extend(tmp)

        # Перед тем как вернуть список, перевернем его,
        # чтобы виждеты полученные от базового класса
        # оказались вначале.
        result.reverse()

        return result

    def bind(self, obj=None, data=None, request=None):
        ObjectWidget.bind(self, obj=obj, data=data, request=request)

        for k, s in self.subwidgets:
            s.bind(
                obj=obj,
                data=data[k] if (data and k in data) else None,
                request=request,
            )

    def validate(self):
        result = ObjectWidget.validate(self)

        for k, s in self.subwidgets:
            result = result and s.validate()

        return result

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        for k, s in self.subwidgets:
            s.populate_obj()

    def widget_module(self):
        return 'ngw/modelWidget/Composite'

    def widget_params(self):
        result = ObjectWidget.widget_params(self)
        result['subwidgets'] = []

        for k, s in self.subwidgets:
            result['subwidgets'].append(dict(key=k, module=s.widget_module()))
            result[k] = s.widget_params()

        return result

    def widget_error(self):
        return dict((k, s.widget_error()) for k, s in self.subwidgets)
