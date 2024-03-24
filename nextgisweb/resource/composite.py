from __future__ import annotations

from typing import Any, Tuple, Type, Union

from msgspec import UNSET, Struct, UnsetType, defstruct, to_builtins
from typing_extensions import Annotated

from nextgisweb.lib.msext import DEPRECATED

from nextgisweb.auth import User
from nextgisweb.core.exception import IUserException

from .model import Resource
from .serialize import CRUTypes, Serializer


class CompositeSerializer:
    def __init__(self, *, keys: Union[Tuple[str, ...], None] = None, user: User):
        self.user = user
        self.members: Tuple[Tuple[str, Type[Serializer]], ...] = tuple(
            (identity, srlzrcls)
            for identity, srlzrcls in Serializer.registry.items()
            if (keys is None or identity in keys)
        )

    def serialize(self, obj: Resource, cls: Type[Struct]) -> Struct:
        result = dict()
        for identity, srlzrcls in self.members:
            srlzr = srlzrcls(obj, user=self.user, data=None)
            if srlzr.is_applicable():
                try:
                    srlzr.serialize()
                    result[identity] = srlzr.data
                except Exception as exc:
                    self.annotate_exception(exc, srlzr)
                    raise
        return cls(**result)

    def deserialize(self, obj: Resource, value: Struct):
        for identity, srlzrcls in self.members:
            sdata = getattr(value, identity)
            if sdata is not UNSET and sdata is not None:
                if not srlzrcls.apitype:
                    sdata = to_builtins(sdata)
                srlzr = srlzrcls(obj, user=self.user, data=sdata)
                if srlzr.is_applicable():
                    try:
                        srlzr.deserialize()
                    except Exception as exc:
                        self.annotate_exception(exc, srlzr)
                        raise

    def annotate_exception(self, exc, mobj):
        """Adds information about serializer that called the exception to the exception"""

        exc.__srlzr_cls__ = mobj.__class__

        try:
            error_info = IUserException(exc)
            error_info.data["serializer"] = mobj.__class__.identity
        except TypeError:
            pass

    @classmethod
    def types(cls) -> CRUTypes:
        create, read, update = list(), list(), list()
        for k, v in Serializer.registry.items():
            t = v.types() if v.apitype else CRUTypes(Any, Any, Any)
            create.append((k, Union[t.create, UnsetType, Annotated[None, DEPRECATED]], UNSET))
            if v.identity == "resource":
                read.append((k, t.read))
            else:
                read.append((k, Union[t.read, UnsetType], UNSET))
            update.append((k, Union[t.update, UnsetType, Annotated[None, DEPRECATED]], UNSET))
            assert all(not v.apitype or pv.apitype for pn, pv in v.proptab)
        return CRUTypes(
            defstruct("CompositeCreate", create),
            defstruct("CompositeRead", read),
            defstruct("CompositeUpdate", update),
        )
