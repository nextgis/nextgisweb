# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import sys

from pyramid import httpexceptions
from pyramid.compat import reraise

from nextgisweb.wfsserver import (
    Service as WFS,
    VERSION_DEFAULT as wfs_version_default,
    VERSION_SUPPORTED as wfs_version_supported
)
from nextgisweb.wmsserver import Service as WMS

from . import parse_request, get_work_version

__all__ = ['get_exception_template']


def get_exception_template(request):
    if isinstance(request, WMS):
        return 'nextgisweb:wmsserver/template/wms111exception.mako'
    elif isinstance(request, WFS):
        params, root_body = parse_request(request)
        version = get_work_version(
            params.get('VERSION'), params.get('ACCEPTVERSIONS'),
            wfs_version_supported, wfs_version_default)
        if version is None:
            version = wfs_version_default
        if version >= '2.0.0':
            return 'nextgisweb:wmsserver/template/wfs100exception.mako'
        else:
            return 'nextgisweb:wmsserver/template/wfs200exception.mako'
    else:
        raise ValueError("Unknown OWService")
