# -*- coding: utf-8 -*-
from pkg_resources import resource_filename

from pyramid.response import FileResponse

from ..package import amd_packages

from .model_controller import ModelController


def permalinker(model, route_name, keys=('id', )):
    def _permalink(model, request):
        return request.route_url(route_name, **dict(
            [(k, getattr(model, k)) for k in keys]
        ))

    model.permalink = _permalink


def amd_package(request):
    amd_package_name = request.matchdict['subpath'][0]
    amd_package_path = '/'.join(request.matchdict['subpath'][1:])
    for p, asset in amd_packages():
        if p == amd_package_name:
            py_package, path = asset.split(':', 1)
            file_path = resource_filename(py_package, '/'.join((path, amd_package_path)))
            return FileResponse(file_path, cache_max_age=3600)
