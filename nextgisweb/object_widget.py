# -*- coding: utf-8 -*-


class ObjectWidget(object):

    def __init__(self, obj=None):
        self.obj = obj
        self.is_new = (obj == None)

    def bind(self, obj=None, data=None, request=None):
        if obj:
            self.obj = obj

        if data:
            self.data = data

        if request:
            self.request = request

    def populate_obj(self):
        pass

    def widget_module(self):
        return 'ngw/ObjectWidget'

    def widget_params(self):
        return dict(is_new=self.is_new)


class CompositeWidget(ObjectWidget):

    def __init__(self, subwidgets, obj=None):
        ObjectWidget.__init__(self, obj)
        self.subwidgets = tuple([(k, c(obj=obj)) for k, c in subwidgets])

    def bind(self, obj=None, data=None, request=None):
        ObjectWidget.bind(self, obj=obj, data=data, request=request)

        for k, s in self.subwidgets:
            s.bind(obj=obj, data=data[k] if data else None, request=request)

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        for k, s in self.subwidgets:
            s.populate_obj()

    def widget_module(self):
        return 'ngw/CompositeWidget'

    def widget_params(self):
        result = ObjectWidget.widget_params(self)
        result['subwidgets'] = []

        for k, s in self.subwidgets:
            result['subwidgets'].append(dict(key=k, module=s.widget_module()))
            result[k] = s.widget_params()

        return result
