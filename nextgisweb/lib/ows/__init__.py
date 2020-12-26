# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from lxml import etree

from six import BytesIO

__all__ = ['parse_request', 'get_exception_template']


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
