from nextgisweb.env import _, pgettext

from .permission import Permission, Scope

P = Permission


class ResourceScope(Scope):
    """Base set of resource permissions"""

    identity = "resource"
    label = _("Resource")

    read = P(pgettext("permission", "Read"))
    create = P(pgettext("permission", "Create")).require(read)
    update = P(pgettext("permission", "Modify")).require(read)
    delete = P(pgettext("permission", "Delete")).require(read)
    manage_children = P(pgettext("permission", "Manage subresources")).require(read)
    change_permissions = P(pgettext("permission", "Configure permissions")).require(read)


class MetadataScope(Scope):
    """Set of permissions for resource metadata. Typical example of resource metadata -
    is its description in free form. This description doesn't affect anything
    it's change doesn't change data structure or anything else.
    As every resource has description this set of permissions is
    included for all resources at Resource class level."""

    identity = "metadata"
    label = _("Metadata")

    read = P(pgettext("permission", "Read")).require(ResourceScope.read)
    write = P(pgettext("permission", "Modify")).require(read)


class DataStructureScope(Scope):
    """Set of permissions for data structure, for example fields structure
    of vector layer, its change might lead to change
    in data itself."""

    identity = "datastruct"
    label = _("Data structure")

    read = P(pgettext("permission", "Read")).require(ResourceScope.read)
    write = P(pgettext("permission", "Modify")).require(read)


class DataScope(Scope):
    """Set of permissions for data access"""

    identity = "data"
    label = _("Data")

    read = P(pgettext("permission", "Read")).require(ResourceScope.read)
    write = P(pgettext("permission", "Modify")).require(read)


class ConnectionScope(Scope):
    """Set of permissions for external connection parameters. In some cases
    we need to store access parameters to external resources. These
    parameters may be sensitive, logins and passwords
    to access remote DB for example."""

    identity = "connection"
    label = _("Connection")

    read = P(pgettext("permission", "Read")).require(ResourceScope.read)
    write = P(pgettext("permission", "Configure")).require(read)
    connect = P(pgettext("permission", "Use")).require(ResourceScope.read)


class ServiceScope(Scope):
    """Set of permissions for services such as WMS or WFS. This is
    needed to separate permissions for service parameters and its actual usage.
    Though if service is using other resources inside, we need to
    their permissions separately."""

    identity = "service"
    label = _("Service")

    connect = P(pgettext("permission", "Access")).require(ResourceScope.read)
    configure = P(pgettext("permission", "Configure")).require(connect)
