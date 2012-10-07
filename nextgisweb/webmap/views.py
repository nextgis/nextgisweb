# -*- coding: utf-8 -*-
from pyramid.view import view_config

from ..models import DBSession
from .models import WebMap

from ..views import model_loader

@view_config(route_name='webmap.browse', renderer='webmap/browse.mako')
def browse(request):
    obj_list = DBSession.query(WebMap)
    return dict(
        obj_list=obj_list
    )

@view_config(route_name='webmap.show', renderer='obj.mako')
@model_loader(WebMap)
def show(request, obj):
    return dict(obj=obj)


@view_config(route_name='webmap.display', renderer='webmap/display.mako')
@model_loader(WebMap)
def display(request, obj):
    return dict(obj=obj)