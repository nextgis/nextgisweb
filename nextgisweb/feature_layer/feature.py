# -*- coding: utf-8 -*-
class Feature(object):

    def __init__(self, layer=None, id=None, fields=None, geom=None, box=None):
        self._layer = layer

        self._id = int(id) if id else None

        self._geom = geom
        self._box = box

        self._fields = dict(fields) if fields is not None else dict()

    @property
    def layer(self):
        return self._layer

    @property
    def id(self):
        return self._id

    @property
    def label(self):
        if self._layer and self._layer.feature_label_field:
            # Если объект привязан к слою и услоя указано поле наименования,
            # то используем его в качестве наименования
            value = self._fields[self._layer.feature_label_field.keyname]
            if value is not None:
                return unicode(value)

        # В противном случае используем id объекта
        return "#%d" % self._id

    def __unicode__(self):
        return self.label

    @property
    def fields(self):
        return self._fields

    @property
    def geom(self):
        return self._geom

    @geom.setter
    def geom(self, value):
        self._geom = value

    @property
    def box(self):
        return self._box

    @property
    def __geo_interface__(self):
        return dict(
            type="Feature",
            id=self.id,
            properties=self.fields,
            geometry=self.geom,
        )


class FeatureSet(object):

    def one(self):
        data = list(self.__iter__())
        return data[0]

    @property
    def __geo_interface__(self):
        return dict(
            type="FeatureCollection",
            features=[f.__geo_interface__ for f in self]
        )
