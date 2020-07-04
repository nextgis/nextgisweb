# -*- coding: utf-8 -*-
import sys
import errno
import os.path
from pkg_resources import resource_filename
from six import reraise

from pyramid.response import FileResponse
from pyramid.httpexceptions import HTTPNotFound

from ..package import amd_packages
from ..compat import lru_cache

from .model_controller import ModelController, DeleteWidget

__all__ = [
    'ModelController',
    'DeleteWidget',
]


def permalinker(model, route_name, keys=('id', )):
    def _permalink(model, request):
        return request.route_url(route_name, **dict(
            (k, getattr(model, k)) for k in keys
        ))

    model.permalink = _permalink


def amd_package(request):
    subpath = request.matchdict['subpath']
    amd_package_name = subpath[0]
    amd_package_path = '/'.join(subpath[1:])

    ap_base_path = _amd_package_path(amd_package_name)
    if ap_base_path is None:
        raise HTTPNotFound()

    try:
        return FileResponse(
            os.path.join(ap_base_path, amd_package_path),
            cache_max_age=3600, request=request)
    except (OSError, IOError) as exc:
        if exc.errno in (errno.ENOENT, errno.EISDIR):
            raise HTTPNotFound()
        reraise(*sys.exc_info())


@lru_cache(maxsize=64)
def _amd_package_path(name):
    for p, asset in amd_packages():
        if p == name:
            py_package, path = asset.split(':', 1)
            return resource_filename(py_package, path)
