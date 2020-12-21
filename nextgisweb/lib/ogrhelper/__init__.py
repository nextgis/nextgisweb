# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from datetime import date, time, datetime

import six
from osgeo import ogr


FIELD_GETTER = {}


def read_layer_features(layer, geometry_format=None):
    geometry_format = 'wkt' if geometry_format is None else geometry_format.lower()
    if geometry_format == 'raw':
        geom_func = _geometry_copy
    elif geometry_format == 'wkt':
        geom_func = _geometry_wkt
    elif geometry_format == 'wkb':
        geom_func = _geometry_wkb

    defn = layer.GetLayerDefn()
    fieldmap = list()
    for fidx in range(defn.GetFieldCount()):
        fdefn = defn.GetFieldDefn(fidx)
        fname = fdefn.GetName()
        fget = FIELD_GETTER[fdefn.GetType()]
        fieldmap.append((fidx, fname, fget))

    for feat in layer:
        geom = feat.GetGeometryRef()
        if geom is not None:
            geom = geom_func(geom)

        yield (
            feat.GetFID(), geom, [
                (fname, fget(feat, fidx) if not feat.IsFieldNull(fidx) else None)
                for (fidx, fname, fget) in fieldmap  # NOQA: F812
            ]
        )


def geometry_force_multi(ogr_geom):
    geom_type = ogr_geom.GetGeometryType()
    if geom_type == ogr.wkbPoint:
        return ogr.ForceToMultiPoint(ogr_geom)
    if geom_type == ogr.wkbLineString:
        return ogr.ForceToMultiLineString(ogr_geom)
    if geom_type == ogr.wkbPolygon:
        return ogr.ForceToMultiPolygon(ogr_geom)
    return ogr_geom


def _geometry_copy(ogr_geom):
    return ogr_geom.Clone()


def _geometry_wkt(ogr_geom):
    return six.ensure_text(ogr_geom.ExportToWkt())


def _geometry_wkb(ogr_geom):
    return ogr_geom.ExportToWkb()


def _get_integer(feat, fidx):
    return feat.GetFieldAsInteger(fidx)


def _get_real(feat, fidx):
    return feat.GetFieldAsDouble(fidx)


def _get_string(feat, fidx):
    return six.ensure_text(feat.GetFieldAsString(fidx))


def _get_date(feat, fidx):
    return date(*feat.GetFieldAsDateTime(fidx)[0:3])


def _get_time(feat, fidx):
    hour, minute, sec = feat.GetFieldAsDateTime(fidx)[3:6]
    sec_int = int(sec)
    msec = int((sec - sec_int) * 1000)
    return time(hour, minute, sec_int, msec)


def _get_datetime(feat, fidx):
    year, month, day, hour, minute, sec = feat.GetFieldAsDateTime(fidx)[0:6]
    sec_int = int(sec)
    msec = int((sec - sec_int) * 1000)
    return datetime(year, month, day, hour, minute, sec_int, msec)


FIELD_GETTER[ogr.OFTInteger] = _get_integer
FIELD_GETTER[ogr.OFTReal] = _get_real
FIELD_GETTER[ogr.OFTString] = _get_string
FIELD_GETTER[ogr.OFTDate] = _get_date
FIELD_GETTER[ogr.OFTTime] = _get_time
FIELD_GETTER[ogr.OFTDateTime] = _get_datetime
