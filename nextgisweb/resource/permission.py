# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from collections import namedtuple, defaultdict

from .scope import scopeid


_scope_permissions = defaultdict(lambda: dict())


Permission = namedtuple('Permission', (
    'scope', 'permission'))


PermissionInfo = namedtuple('PermissionInfo', (
    'cls', 'scope', 'permission',
    'label', 'description'))


def register_permission(cls, permission, label, description=None):
    global _scope_permissions
    _scope_permissions[cls][permission] = PermissionInfo(
        cls=cls, scope=scopeid(cls), permission=permission,
        label=label, description=description)


def permission(cls, permission):
    return _scope_permissions[cls][permission]


def scope_permissions(cls):
    global _scope_permissions
    return dict(_scope_permissions[cls])
