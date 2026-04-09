from __future__ import annotations

from typing import Type

from msgspec import UNSET, Struct, UnsetType, convert, defstruct

from nextgisweb.auth import User
from nextgisweb.core.exception import UserException

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
                srlzr.serialize()
                result[identity] = srlzr.data
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
                except UserException as exc:
                    exc.data["serializer"] = srlzr.__class__.identity
                    raise

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
