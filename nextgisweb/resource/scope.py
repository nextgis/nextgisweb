from nextgisweb.env import gettext, pgettext

from .permission import Permission, Scope

P = Permission


class ResourceScope(Scope):
    """Base set of resource permissions"""

    identity = "resource"
    label = gettext("Resource")

    read = P(pgettext("permission", "Read"))
    create = P(pgettext("permission", "Create")).require(read)
    update = P(pgettext("permission", "Modify")).require(read)
    delete = P(pgettext("permission", "Delete")).require(read)
    manage_children = P(pgettext("permission", "Manage subresources")).require(read)
    change_permissions = P(pgettext("permission", "Configure permissions")).require(read)


class DataScope(Scope):
    """Set of permissions for data access"""

    identity = "data"
    label = gettext("Data")

    read = P(pgettext("permission", "Read data")).require(ResourceScope.read)
    write = P(pgettext("permission", "Modify data")).require(read)


class ConnectionScope(Scope):
    """Set of permissions for external connection parameters. In some cases
    we need to store access parameters to external resources. These
    parameters may be sensitive, logins and passwords
    to access remote DB for example."""

    identity = "connection"
    label = gettext("External connections")

    read = P(pgettext("permission", "Read connection parameters")).require(ResourceScope.read)
    write = P(pgettext("permission", "Configure connection")).require(read)
    connect = P(pgettext("permission", "Use connection")).require(ResourceScope.read)


class ServiceScope(Scope):
    """Set of permissions for services such as WMS or WFS. This is
    needed to separate permissions for service parameters and its actual usage.
    Though if service is using other resources inside, we need to
    their permissions separately."""

    identity = "service"
    label = gettext("Web GIS services")

    connect = P(pgettext("permission", "Access service")).require(ResourceScope.read)
    configure = P(pgettext("permission", "Configure service")).require(connect)
