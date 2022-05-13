import struct

import PIL.ImageStat
from affine import Affine

from ..i18n import trstring_factory
from ..core.exception import ValidationError


COMP_ID = 'render'
_ = trstring_factory(COMP_ID)


def imgcolor(img):
    """ Check image color and return color tuple if all pixels have same color """
    if img is None:
        return (0, 0, 0, 0)

    # Min and max values for each channel.
    extrema = PIL.ImageStat.Stat(img).extrema

    # If image has transparent alpha channel, other channels won't matter.
    alpha = extrema[3]
    if alpha[0] == 0 and alpha[1] == 0:
        return (0, 0, 0, 0)

    for comp in extrema:
        if comp[0] != comp[1]:
            return None

    return [c[0] for c in extrema]


def af_transform(a, b):
    """ Crate affine transform from coordinate system A to B """
    return ~(
        Affine.translation(a[0], a[3]) * Affine.scale(
            (a[2] - a[0]) / b[2], (a[1] - a[3]) / b[3]
        ) * Affine.translation(b[0], b[1]))


def affine_from_bounds(a, b):
    # Force arguments to float
    a = [float(i) for i in a]
    b = [float(i) for i in b]

    return ~(
        Affine.translation(a[0], a[1]) * Affine.scale(
            (a[2] - a[0]) / (b[2] - b[0]),
            (a[3] - a[1]) / (b[3] - b[1])
        ) * Affine.translation(- b[0], - b[1]))


def affine_bounds_to_tile(bounds, zoom):
    tilemax = 2 ** zoom
    return affine_from_bounds(
        bounds, (0, tilemax, tilemax, 0))


def pack_color(color):
    """ Pack color tuple to integer value. """
    return struct.unpack('!i', bytearray(color))[0]


def unpack_color(value):
    """ Unpack color integer value to color tuple. """
    return tuple(iter(struct.pack('!i', value)))


def zxy_from_request(request):
    result = []

    for p in 'zxy':
        try:
            raw = request.GET[p]
            val = int(raw)
            if val < 0:
                raise ValueError
            result.append(val)
        except KeyError:
            raise ValidationError(message=_(
                "Required parameter '{}' is missing."
            ).format(p))
        except ValueError:
            if request.GET[p] == ('{' + p + '}'):
                raise ValidationError(message=_(
                    "Placeholders {x}, {y} and {z} must be filled with values."
                ), detail=_(
                    "It seems you are trying to open an URL template directly "
                    "in a browser. To test it try adding some values for 'x', "
                    "'y' and 'z' parameters."
                ))
            raise ValidationError(message=_(
                "The value of '{}' parameter must be a non-negative integer."
            ).format(p))

    return result
