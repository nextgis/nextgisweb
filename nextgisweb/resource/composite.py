from __future__ import annotations

from typing import Type

from msgspec import UNSET, Struct, UnsetType, convert, defstruct

from nextgisweb.auth import User
from nextgisweb.core.exception import IUserException

from .model import Resource
from .serialize import CRUTypes, Serializer


class CompositeSerializer:
    def __init__(self, *, keys: tuple[str, ...] | None = None, user: User):
        self.user = user
        self.members: tuple[tuple[str, Type[Serializer]], ...] = tuple(
            (identity, srlzrcls)
            for identity, srlzrcls in Serializer.registry.items()
            if (keys is None or identity in keys)
        )

    def serialize(self, obj: Resource, cls: Type[Struct]) -> Struct:
        result = dict()
        for identity, srlzrcls in self.members:
            if srlzrcls.is_applicable(obj):
                srlzr = srlzrcls(obj, user=self.user, data=None)
                try:
                    srlzr.serialize()
                    result[identity] = srlzr.data
                except Exception as exc:
                    self.annotate_exception(exc, srlzr)
                    raise
        return cls(**result)

    def deserialize(self, obj: Resource, value: Struct):
        for identity, srlzrcls in self.members:
            if srlzrcls.is_applicable(obj):
                sdata = getattr(value, identity)
                if sdata is UNSET or sdata is None:
                    if not (obj.id is None and srlzrcls.create):
                        continue
                    sdata = convert(dict(), srlzrcls.types().create)

                srlzr = srlzrcls(obj, user=self.user, data=sdata)
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
            t = v.types()
            if v.identity == "resource":
                create.append((k, t.create))
                read.append((k, t.read))
            else:
                create.append((k, t.create | UnsetType, UNSET))
                read.append((k, t.read | UnsetType, UNSET))
            update.append((k, t.update | UnsetType, UNSET))
        return CRUTypes(
            defstruct("CompositeCreate", create),
            defstruct("CompositeRead", read),
            defstruct("CompositeUpdate", update),
        )
