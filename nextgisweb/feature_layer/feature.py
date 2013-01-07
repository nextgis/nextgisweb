# -*- coding: utf-8 -*-
class Feature(object):

    def __init__(self, id=None, fields=None, geom=None):
        self._id = int(id)
        self._fields = dict(fields)
        self._geom = geom

    @property
    def id(self):
        return self._id

    @property
    def fields(self):
        return self._fields

    @property
    def geom(self):
        return self._geom

    @property
    def __geo_interface__(self):
        return dict(
            id=self.id,
            properties=self.fields,
            geometry=self.geom,
        )


class FeatureSet(object):
    
    @property
    def __geo_interface__(self):
        return dict(
            type="FeatureCollection",
            features=list(self.__iter__())
        )