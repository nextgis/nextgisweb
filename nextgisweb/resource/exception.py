from nextgisweb.env import gettext

from nextgisweb.core.exception import InsufficientPermissions, UserException, ValidationError


class ResourceNotFound(UserException):
    title = gettext("Resource not found")
    message = gettext("Resource with id = %d was not found.")
    detail = gettext(
        "The resource may have been deleted or an error in the address. Correct "
        "the address or go to the home page and try to find the desired resource."
    )
    http_status_code = 404

    def __init__(self, resource_id):
        super().__init__(
            message=self.__class__.message % resource_id, data=dict(resource_id=resource_id)
        )


class AttributeUpdateForbidden(InsufficientPermissions):
    def __init__(self, attr):
        super().__init__()
        write = attr.write
        attribute = f"{attr.srlzrcls.identity}.{attr.attrname}"
        if attr.write is not None:
            self.message = gettext(
                "Modification of the '{attribute}' attribute requires "
                "the '{scope}: {permission}' permission."
            ).format(attribute=attribute, scope=write.scope.label, permission=write.label)
            self.data.update(scope=write.scope.identity, permission=write.name)
        else:
            self.message = gettext(
                "The '{attribute}' attribute is read-only and cannot be updated."
            ).format(attribute=attribute)
            self.data.update(scope=None, permission=None)


class DisplayNameNotUnique(ValidationError):
    title = gettext("Resource display name is not unique")
    message = gettext("Resource with same display name already exists (id = %d).")
    detail = gettext(
        "Within a single parent resource, each resource must have unique display "
        "name. Give the resource a different display name or rename existing."
    )

    def __init__(self, resource_id):
        super().__init__(
            message=self.__class__.message % resource_id, data=dict(resource_id=resource_id)
        )


class HierarchyError(ValidationError):
    title = gettext("Hierarchy error")


class QuotaExceeded(UserException):
    title = gettext("Quota exceeded")
    http_status_code = 402

    def __init__(self, *, cls, required, limit, count):
        available = max(limit - count, 0)
        if required < 2:
            msg = gettext("Maximum number of resources exceeded. The limit is %s.") % limit
        else:
            msg = gettext(
                "Not enough resource quota: {0} required, but only {1} available."
            ).format(required, available)
        if cls is not None:
            msg += " " + gettext("Resource type - {}.").format(cls.cls_display_name)

        super().__init__(
            message=msg,
            data=dict(
                cls=cls.identity if cls else None,
                required=required,
                available=available,
            ),
        )
