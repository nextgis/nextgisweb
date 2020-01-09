# -*- coding: utf-8 -*-
""" Universal sets of permissions
=================================

"""

from __future__ import unicode_literals
from .permission import Scope, Permission
from .util import _

__all__ = [
    'ResourceScope',
    'MetadataScope',
    'DataStructureScope',
    'DataScope',
    'ConnectionScope',
    'ServiceScope',
]

P = Permission


class ResourceScope(Scope):
    """ Base set of resource permissions """

    identity = 'resource'
    label = _("Resource")

    read = P(_("Read"))
    """ Read: ability to read class, name and key of the
    resource. Most of the other permissions depend on Read, for
    example Update, so you can't change a resource
    if you can't read it. """

    create = P(_("Create")).require(read)
    """ Create: a little bit fuzzy rule that is not used currently. The idea was
    to check Create permission while creating a new resource,
    but currenty only :py:attr:`manage_children` permission is checked
    for child resource. Possibly will have to return to this one
    as it is impossible to restrict creation of resources with certain types without this rule. """

    update = P(_("Update")).require(read)
    """ Update: change name and key of the resource
    analogous to :py:attr:`read`. Doesn't affect changes to any other attributes. """

    delete = P(_("Delete")).require(read)
    """ Delete: permission to remove this resource. Besides that to really remove a resource
    one will also need :py:attr:`manage_children` permission
    for parent resource. """

    manage_children = P(_("Manage children")).require(read)
    """ Manage children resources """

    change_permissions = P(_("Change permissions")).require(read)
    """ Manage permissions """


class MetadataScope(Scope):
    """ Set of permissions for resource metadata. Typical example of resource metadata -
    is its description in free form. This description doesn't affect anything
    it's change doesn't change data structure or anything else.
    As every resource has description this set of permissions is
    included for all resources at Resource class level. """

    identity = 'metadata'
    label = _("Metadata")

    read = P(_("Read"))                   #: Read
    write = P(_("Write")).require(read)   #: Write


class DataStructureScope(Scope):
    """ Set of permissions for data structure, for example fields structure
    of vector layer, its change might lead to change
    in data itself. """

    identity = 'datastruct'
    label = _("Data structure")

    read = P(_("Read"))                   #: Read
    write = P(_("Write")).require(read)   #: Write


class DataScope(Scope):
    """ Set of permissions for data access """

    identity = 'data'
    label = _("Data")

    read = P(_("Read"))                   #: Read
    write = P(_("Write")).require(read)   #: Write


class ConnectionScope(Scope):
    """ Set of permissions for external connection parameters. In some cases
    we need to store access parameters to external resources. These
    parameters may be sensitive, logins and passwords
    to access remote DB for example. """

    identity = 'connection'
    label = _("Connection")

    read = P(_("Read"))
    write = P(_("Write")).require(read)
    connect = P(_("Connect"))


class ServiceScope(Scope):
    """ Set of permissions for services such as WMS or WFS. This is
    needed to separate permissions for service parameters and its actual usage.
    Though if service is using other resources inside, we need to
    their permissions separately. """

    identity = 'service'
    label = _('Service')

    connect = P(_("Connect"))                       #: Connection
    configure = P(_("Configure")).require(connect)  #: Configuration
