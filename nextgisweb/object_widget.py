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
        # Validation should be run once
        assert not self.__validate_flag
        self.__validate_flag = True

        self.error = None
        return True

    def populate_obj(self):
        # Only after validate() and bind(data=data)
        assert self.__validate_flag and self.__obj_bind_flag

    def widget_module(self):
        pass

    def widget_params(self):
        return dict(
            operation=self.operation,
        )

    def widget_error(self):
        # Errors may appear only after validation
        assert self.__validate_flag

        return self.error
