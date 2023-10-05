import warnings

from zope.interface import implementer

from nextgisweb.env import _

from nextgisweb.core.exception import IUserException, UserException, ValidationError


class ResourceNotFound(UserException):
    title = _("Resource not found")
    message = _("Resource with id = %d was not found.")
    detail = _(
        "The resource may have been deleted or an error in the address. Correct "
        "the address or go to the home page and try to find the desired resource."
    )
    http_status_code = 404

    def __init__(self, resource_id):
        super().__init__(
            message=self.__class__.message % resource_id, data=dict(resource_id=resource_id)
        )


class DisplayNameNotUnique(ValidationError):
    title = _("Resource display name is not unique")
    message = _("Resource with same display name already exists (id = %d).")
    detail = _(
        "Within a single parent resource, each resource must have unique display "
        "name. Give the resource a different display name or rename existing."
    )

    def __init__(self, resource_id):
        super().__init__(
            message=self.__class__.message % resource_id, data=dict(resource_id=resource_id)
        )


class HierarchyError(ValidationError):
    title = _("Hierarchy error")


class QuotaExceeded(UserException):
    title = _("Quota exceeded")
    http_status_code = 402

    def __init__(self, *, cls, required, limit, count):
        available = max(limit - count, 0)
        if required < 2:
            msg = _("Maximum number of resources exceeded. The limit is %s.") % limit
        else:
            msg = _("Not enough resource quota: {0} required, but only {1} available.").format(
                required, available
            )
        if cls is not None:
            msg += " " + _("Resource type - {}.").format(cls.cls_display_name)

        super().__init__(
            message=msg,
            data=dict(
                cls=cls.identity if cls else None,
                required=required,
                available=available,
            ),
        )


# TODO: Rewrite old-style resource exception classes


@implementer(IUserException)
class ResourceError(Exception):
    """Base class for resource exceptions"""

    def __init__(self, message, data=None):
        warnings.warn(
            "{} is deprecated!".format(self.__class__.__name__), DeprecationWarning, stacklevel=2
        )
        self.message = message
        self.data = data if data is not None else dict()


class ForbiddenError(ResourceError):
    title = _("Forbidden")
    http_status_code = 403


class OperationalError(ResourceError):
    """Exception raised by incorrect system
    behavior, 'something went wrong'"""

    title = _("Operational error")
    http_status_code = 503


Forbidden = ForbiddenError  # TODO: Depricate
