from datetime import date, datetime, time
from typing import Dict, Union

from msgspec import UNSET, UnsetType
from osgeo import ogr

from nextgisweb.lib.geometry import Geometry

from .interface import FIELD_TYPE


class Feature:
    def __init__(self, layer=None, id=None, version=None, fields=None, geom=UNSET, box=None):
        self._layer = layer
        self._id = int(id) if id is not None else None
        self._version = version
        self._geom = geom
        self._box = box
        self._fields = dict(fields) if fields is not None else dict()

    @property
    def layer(self):
        return self._layer

    @property
    def id(self) -> Union[int, None]:
        return self._id

    @id.setter
    def id(self, value: Union[int, None]):
        if self._id is not None and self._id != int(value):
            raise ValueError("Existing feature ID can't be changed.")
        self._id = value

    @property
    def version(self) -> Union[int, None]:
        return self._version

    @property
    def label(self) -> Union[str, None]:
        if self._layer and self._layer.feature_label_field:
            # If object is linked to a layer and naming field is set for a layer
            # use it for naming.
            label_field = self._layer.feature_label_field
            value = self._fields[label_field.keyname]
            if value is not None:
                if label_field.datatype == FIELD_TYPE.STRING:
                    return value
                else:
                    return "{}".format(value)

        # Otherwise use object id
        return "#%d" % self._id

    def __str__(self):
        return self.label

    @property
    def fields(self) -> Dict[str, Union[None, int, bool, float, str, date, time, datetime]]:
        return self._fields

    @property
    def geom(self) -> Union[Geometry, None, UnsetType]:
        return self._geom

    @geom.setter
    def geom(self, value: Union[Geometry, None, UnsetType]):
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

    def to_ogr(self, layer_defn, *, aliases=None, fid=None):
        ogr_feature = ogr.Feature(layer_defn)
        ogr_feature.SetFID(self.id)
        ogr_feature.SetGeometry(self.geom.ogr if self.geom else None)

        for k, v in self.fields.items():
            name = k if aliases is None else aliases[k]
            match v:
                case None:
                    pass
                case int() | float() | str():
                    ogr_feature.SetField(name, v)
                case datetime():
                    ogr_feature.SetField(
                        name, v.year, v.month, v.day, v.hour, v.minute, v.second, 0
                    )
                case date():
                    ogr_feature.SetField(name, v.year, v.month, v.day, 0, 0, 0, 0)
                case time():
                    ogr_feature.SetField(name, 0, 0, 0, v.hour, v.minute, v.second, 0)

        if fid is not None:
            ogr_feature.SetField(fid, self.id)

        return ogr_feature


class FeatureSet:
    def one(self):
        data = list(self.__iter__())
        return data[0]

    @property
    def __geo_interface__(self):
        return dict(
            type="FeatureCollection",
            features=[f.__geo_interface__ for f in self],
        )
