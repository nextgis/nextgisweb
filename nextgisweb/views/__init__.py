# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
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
