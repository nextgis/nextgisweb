# -*- coding: utf-8 -*-
from pyramid.httpexceptions import HTTPForbidden

from ..registry import registry_maker
from ..component import Component, require

from .models import PERMISSION_ALL

@Component.registry.register
class SecurityComponent(Component):
    identity = 'security'

    def __init__(self, env, settings):
        super(SecurityComponent, self).__init__(env, settings)

        self._resources = dict()
        self._permissions = dict()
        self._children = dict()

    @require('auth')
    def initialize(self):
        from . import models
        models.initialize(self)

    @property
    def resources(self):
        return self._resources

    @property
    def permissions(self):
        return self._permissions

    @property
    def children(self):
        return self._children

    def resource_name(self, resource):
        if isinstance(resource, basestring):
            return resource
        elif hasattr(resource, 'identity'):
            return resource.identity
        elif hasattr(resource, '__tablename__'):
            return resource.__tablename__
        else:
            raise AssertionError("Invalid resource: %r" % resource)

    def add_resource(self, resource, **kwargs):
        resource = self.resource_name(resource)

        assert resource not in self._resources
        self._resources[resource] = kwargs
        self._children[resource] = list()
        self._permissions[resource] = dict()

        self.add_permission(resource, PERMISSION_ALL, label=u"Все права")

    def add_resource_child(self, parent, child):
        parent = self.resource_name(parent)
        child = self.resource_name(child)

        assert child not in self._children[parent]
        self._children[parent].append(child)

    def add_permission(self, resource, permission, **kwargs):
        resource = self.resource_name(resource)

        assert permission not in self.permissions[resource]
        self._permissions[resource][permission] = kwargs

    def setup_pyramid(self, config):
        
        def require_permission(request, model, *permissions):
            if not model.has_permission(request.user, *permissions):
                raise HTTPForbidden()

        config.add_request_method(require_permission, 'require_permission')

        from . import views, controllers
        views.setup_pyramid(self, config)
        controllers.setup_pyramid(self, config)


class SecurityProvider(object):
    registry = registry_maker()

    @classmethod
    def permission_scopes(cls):
        return ()

    @classmethod
    def permission_categories(cls):
        return ()

    @classmethod
    def permissions(cls):
        return ()
