# -*- coding: utf-8 -*-
from ..registry import registry_maker
from ..component import Component
from .models import PermissionCategory, Permission, PermissionScope, ACL, ACLItem


@Component.registry.register
class SecurityComponent(Component):
    identity = 'security'

    @classmethod
    def initialize_db(cls, dbsession):
        scopes = []
        categories = []
        permissions = []

        for impl in SecurityProvider.registry:
            scopes.extend(impl.permission_scopes())
            categories.extend(impl.permission_categories())
            permissions.extend(impl.permissions())

        for i in scopes:
            dbsession.add(PermissionScope(
                **dict(zip(('keyname', 'display_name'), i))
            ))

        for i in categories:
            keyname, display_name, cscopes = i
            dbsession.add(PermissionCategory(
                keyname=keyname,
                display_name=display_name,
            ))

            dbsession.add(Permission(category_keyname=keyname, keyname='*', display_name=u"Все права"))

            for s in cscopes:
                scope = dbsession.query(PermissionScope).get(s)
                scope.categories.append(dbsession.query(PermissionCategory).get(keyname))

        for i in permissions:
            dbsession.add(Permission(
                **dict(zip(('category_keyname', 'keyname', 'display_name'), i))
            ))

    @classmethod
    def setup_routes(cls, config):
        config.add_route('permission_scope.browse', '/permission_scope/')
        config.add_route('permission_category.browse', '/permission_category/')
        config.add_route('permission_category.show', '/permissions_category/{keyname}')


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
