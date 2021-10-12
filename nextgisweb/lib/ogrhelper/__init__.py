import ctypes
import zipfile
from datetime import date, time, datetime

from osgeo import gdal, ogr


FIELD_GETTER = {}


def _set_encoding(encoding):

    class encoding_section(object):

        def __init__(self, encoding):
            self.encoding = encoding

            if self.encoding:
                # For GDAL 1.9 and higher try to set SHAPE_ENCODING
                # through ctypes and libgdal

                # Load library only if we need
                # to recode
                self.lib = ctypes.CDLL('libgdal.so')

                # cpl_conv.h functions wrappers
                # see http://www.gdal.org/cpl__conv_8h.html

                # CPLGetConfigOption
                self.get_option = self.lib.CPLGetConfigOption
                self.get_option.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
                self.get_option.restype = ctypes.c_char_p

                # CPLStrdup
                self.strdup = self.lib.CPLStrdup
                self.strdup.argtypes = [ctypes.c_char_p, ]
                self.strdup.restype = ctypes.c_char_p

                # CPLSetThreadLocalConfigOption
                # Use thread local function
                # to minimize side effects.
                self.set_option = self.lib.CPLSetThreadLocalConfigOption
                self.set_option.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
                self.set_option.restype = None

        def __enter__(self):
            def strdecode(x):
                if len(x) >= 254:
                    # Cludge to fix 254 - 255 byte unicode string cut off
                    # Until we can decode
                    # cut a byte on the right

                    while True:
                        try:
                            x.decode(self.encoding)
                            break
                        except UnicodeDecodeError:
                            x = x[:-1]

                return x.decode(self.encoding)

            if self.encoding:
                # Set SHAPE_ENCODING value

                # Keep copy of the current value
                tmp = self.get_option('SHAPE_ENCODING'.encode(), None)
                self.old_value = self.strdup(tmp)

                # Set new value
                self.set_option('SHAPE_ENCODING'.encode(), ''.encode())

                return strdecode

            return lambda x: x

        def __exit__(self, type, value, traceback):
            if self.encoding:
                # Return old value
                self.set_option('SHAPE_ENCODING'.encode(), self.old_value)

    return encoding_section(encoding)


def read_dataset(filename, encoding=None, **kw):

    iszip = zipfile.is_zipfile(filename)
    ogrfn = '/vsizip/{%s}' % filename if iszip else filename

    def _open():
        return gdal.OpenEx(ogrfn, 0, **kw)

    # with _set_encoding(encoding) as sdecode:
    #     ogrds = _open()
    #     strdecode = sdecode

    # Ignore encoding option in Python 3
    ogrds = _open()

    def strdecode(x):
        return x

    return ogrds, strdecode


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
    return ogr_geom.ExportToWkt()


def _geometry_wkb(ogr_geom):
    return ogr_geom.ExportToWkb(ogr.wkbNDR)


def _get_integer(feat, fidx):
    return feat.GetFieldAsInteger(fidx)


def _get_real(feat, fidx):
    return feat.GetFieldAsDouble(fidx)


def _get_string(feat, fidx):
    return feat.GetFieldAsString(fidx)


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
