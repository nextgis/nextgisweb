from io import BytesIO

from lxml import etree

__all__ = ['parse_request', 'parse_epsg_code', 'get_exception_template', 'FIELD_TYPE_WFS']


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


def parse_epsg_code(value):
    # 'urn:ogc:def:crs:EPSG::3857' -> 3857
    # http://www.opengis.net/def/crs/epsg/0/4326 -> 4326
    return int(value.split(':')[-1].split('/')[-1])


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
