from osgeo import ogr

from .interface import FIELD_TYPE


class Feature(object):

    def __init__(self, layer=None, id=None, fields=None, geom=None, box=None, calculations=None):
        self._layer = layer

        self._id = int(id) if id is not None else None

        self._geom = geom
        self._box = box

        self._fields = dict(fields) if fields is not None else dict()

        self._calculations = dict(calculations) if calculations else dict()

    @property
    def layer(self):
        return self._layer

    @property
    def id(self):
        return self._id

    @property
    def label(self):
        if self._layer and self._layer.feature_label_field:
            # If object is linked to a layer and naming field is set for a layer
            # use it for naming.
            label_field = self._layer.feature_label_field
            value = self._fields[label_field.keyname]
            if value is not None:
                if label_field.datatype == FIELD_TYPE.STRING:
                    return value
                else:
                    return '{}'.format(value)

        # Otherwise use object id
        return "#%d" % self._id

    def __str__(self):
        return self.label

    @property
    def fields(self):
        return self._fields

    @property
    def calculations(self):
        return self._calculations

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
            geometry=self.geom.shape,
        )

    def to_ogr(self, layer_defn, fid=None):
        ogr_feature = ogr.Feature(layer_defn)
        ogr_feature.SetFID(self.id)
        ogr_feature.SetGeometry(
            ogr.CreateGeometryFromWkb(self.geom.wkb)
        )

        for field in self.fields:
            ogr_feature[field] = self.fields[field]

        if fid is not None:
            ogr_feature[fid] = self.id

        return ogr_feature


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
