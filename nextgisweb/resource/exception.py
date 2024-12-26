from nextgisweb.env import gettext, gettextf

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
            self.message = gettextf(
                "Modification of the '{attribute}' attribute requires "
                "the '{permission}' permission."
            )(attribute=attribute, permission=write.label)
            self.data.update(scope=write.scope.identity, permission=write.name)
        else:
            self.message = gettextf(
                "The '{attribute}' attribute is read-only and cannot be updated."
            )(attribute=attribute)
            self.data.update(scope=None, permission=None)


class ResourceInterfaceNotSupported(UserException):
    title = gettext("Interface not supported")
    http_status_code = 422


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


class ResourceRootDeleteError(HierarchyError):
    message = gettext("Root resource could not be deleted.")


class ResourceDisabled(ValidationError):
    message = gettext("Resource class '%s' disabled.")

    def __init__(self, resource_cls):
        super().__init__(
            message=self.__class__.message % resource_cls, data=dict(resource_cls=resource_cls)
        )


class QuotaExceeded(UserException):
    title = gettext("Quota exceeded")
    http_status_code = 402

    def __init__(self, *, cls, required, limit, count):
        available = max(limit - count, 0)
        if required < 2:
            msg = gettext("Maximum number of resources exceeded. The limit is %s.") % limit
        else:
            msg = gettextf("Not enough resource quota: {0} required, but only {1} available.")(
                required, available
            )
        if cls is not None:
            msg += " " + gettextf("Resource type - {}.")(cls.cls_display_name)

        super().__init__(
            message=msg,
            data=dict(
                cls=cls.identity if cls else None,
                required=required,
                available=available,
            ),
        )
