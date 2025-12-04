from math import log2
from urllib.parse import parse_qsl, urlparse


class SCHEME:
    XYZ = "xyz"
    TMS = "tms"

    enum = (XYZ, TMS)


def crop_box(src_extent, dst_extent, width, height):
    left = round((dst_extent[0] - src_extent[0]) / (src_extent[2] - src_extent[0]) * width)
    right = round((dst_extent[2] - src_extent[0]) / (src_extent[2] - src_extent[0]) * width)
    upper = round((src_extent[3] - dst_extent[3]) / (src_extent[3] - src_extent[1]) * height)
    bottom = round((src_extent[3] - dst_extent[1]) / (src_extent[3] - src_extent[1]) * height)
    return (left, upper, right, bottom)


def render_zoom(srs, extent, size, tilesize):
    res_x = (extent[2] - extent[0]) / size[0]
    res_y = (extent[3] - extent[1]) / size[1]

    width = (srs.maxx - srs.minx) / res_x
    height = (srs.maxy - srs.miny) / res_y

    zoom = log2(min(width, height) / tilesize)

    if zoom % 1 > 0.9:
        return int(zoom + 1)
    return int(zoom)


def quad_key(x, y, z):
    quadKey = ""
    for i in range(z):
        digit = 0
        mask = 1 << i
        if (x & mask) != 0:
            digit += 1
        if (y & mask) != 0:
            digit += 2
        quadKey = str(digit) + quadKey
    return quadKey


def toggle_tms_xyz_y(z, y):
    return (1 << z) - y - 1


def split_url_query(url: str) -> tuple[str, dict[str, str]]:
    presult = urlparse(url, allow_fragments=False)
    query = dict(parse_qsl(presult.query))
    return presult._replace(query="").geturl(), query
