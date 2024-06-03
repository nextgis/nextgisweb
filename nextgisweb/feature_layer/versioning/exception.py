from nextgisweb.env import gettext

from nextgisweb.core.exception import UserException, ValidationError

from ..interface import IVersionableFeatureLayer


class VersioningException(Exception):
    pass


class VersioningContextRequired(VersioningException):
    pass


class FVersioningNotImplemented(UserException):
    title = gettext("Not implemented for feature versioning")
    message = gettext(
        "This operation cannot be performed on a resource with feature "
        "versioning enabled. Disable feature versioning for the resource "
        "first, and then try again."
    )
    http_status_code = 501


class FVersioningNotEnabled(ValidationError):
    title = gettext("Feature versioning required")

    @classmethod
    def disprove(cls, resource):
        if not IVersionableFeatureLayer.providedBy(resource):
            m = gettext("Feature versioning is not supported for this resource.")
        elif not resource.fversioning:
            m = gettext("Feature versioning is not enabled for this resource.")
        else:
            return
        raise cls(message=m)


class FVersioningEpochRequired(ValidationError):
    title = gettext("Epoch required")


class FVersioningEpochMismatch(ValidationError):
    title = gettext("Epoch mismatch")

    @classmethod
    def disprove(cls, resource, epoch):
        if epoch == resource.fversioning.epoch:
            return
        raise cls()


class FVersioningOutOfRange(ValidationError):
    title = gettext("Version out of range")

    @classmethod
    def disprove(cls, resource, version, *, allow_zero=False):
        if (0 if allow_zero else 1) <= version <= resource.fversioning.latest:
            return
        raise cls()


class FVersioningInvalidRange(ValidationError):
    title = gettext("Invalid range")

    @classmethod
    def disprove(cls, intial: int, target: int):
        if intial >= target:
            raise cls()
