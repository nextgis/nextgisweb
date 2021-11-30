import re
from io import BytesIO

from lxml import etree

__all__ = [
    'parse_request',
    'SRSParseError',
    'parse_srs',
    'get_exception_template',
    'FIELD_TYPE_WFS',
]


class FIELD_TYPE_WFS(object):
    INTEGER = 'integer'
    LONG = 'long'
    DOUBLE = 'double'
    STRING = 'string'
    DATE = 'date'
    TIME = 'time'
    DATETIME = 'dateTime'


def _ns_trim(value):
    pos = max(value.find('}'), value.rfind(':'))
    return value[pos + 1:]


def parse_request(request):
    params = dict()
    root_body = None

    if request.method == 'GET':
        params = request.params
    elif request.method == 'POST':
        parser = etree.XMLParser(recover=True)
        root_body = etree.parse(BytesIO(request.body), parser=parser).getroot()
        params = root_body.attrib
        params['REQUEST'] = _ns_trim(root_body.tag)
    else:
        pass

    # Parameter names shall not be case sensitive
    params = dict((k.upper(), v) for k, v in params.items())

    return params, root_body


class SRSParseError(ValueError):
    pass


srs_formats = dict(
    short=dict(pattern=re.compile(r'EPSG:(\d+)'), axis_xy=True),
    ogc_urn=dict(pattern=re.compile(r'urn:ogc:def:crs:EPSG::(\d+)'), axis_xy=False),
    ogc_url=dict(pattern=re.compile(r'http://www.opengis.net/def/crs/EPSG/0/(\d+)'),
                 axis_xy=False),
)


def parse_srs(value):
    for srs_format in srs_formats.values():
        match = srs_format['pattern'].match(value)
        if match is not None:
            return int(match[1]), srs_format['axis_xy']
    raise SRSParseError("Could not recognize SRS format '%s'." % value)


def get_work_version(p_version, p_acceptversions, version_supported, version_default):
    version = p_version
    if version is None:
        if p_acceptversions is not None:
            accept_versions = sorted(p_acceptversions.split(','), reverse=True)
            for v in accept_versions:
                if v in version_supported:
                    version = v
                    break
        else:
            version = version_default

    return version if version in version_supported else None
