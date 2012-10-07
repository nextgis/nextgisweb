# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.renderers import render_to_response

from ..views import model_loader

from ..models import DBSession
from ..wtforms import Form, fields, validators

from ..auth import Principal

from .models import PermissionScope, PermissionCategory, Permission, ACLItem


def query_principals():
    return DBSession.query(Principal)


def query_permissions():
    return DBSession.query(Permission)


class ACLItemNewForm(Form):
    principal = fields.QuerySelectField(u"Субъект", query_factory=query_principals)
    permission = fields.QuerySelectField(u"Право доступа", query_factory=query_permissions)


@view_config(route_name='permission_scope.browse', renderer='permission_scope/browse.mako')
def permission_scope_browse(request):
    obj_list = DBSession.query(PermissionScope).all()
    return dict(
        obj_list=obj_list,
        title=u"Области действия прав доступа",
    )


@view_config(route_name='permission_category.browse', renderer='permission_category/browse.mako')
def permission_category_browse(request):
    obj_list = DBSession.query(PermissionCategory).all()
    return dict(
        obj_list=obj_list,
        title=u"Группы прав доступа",
    )

@view_config(route_name='permission_category.show', renderer='permission_category/show.mako')
@model_loader(PermissionCategory, key='keyname')
def permission_category_show(request, obj):
    return dict(
        obj=obj,
    )


def acl_editor_view(request, obj, acl):
    new_item_form = ACLItemNewForm(request.POST)

    if request.method == 'POST' and new_item_form.validate():
        acl_item = ACLItem(acl=acl)
        new_item_form.populate_obj(acl_item)
        DBSession.add(acl_item)

    return render_to_response('acl/edit.mako', dict(
        obj=obj,
        acl=acl,
        new_item_form=new_item_form,
        subtitle=u"Управление доступом",
    ), request=request)