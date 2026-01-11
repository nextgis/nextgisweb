from datetime import datetime
from secrets import token_urlsafe
from uuid import uuid4

import pytest
import transaction
from sqlalchemy import event
from typing_extensions import Unpack

from nextgisweb.env.test import fixture_value

from nextgisweb.auth import User
from nextgisweb.pyramid.test import TestResponse, WebTestApp

from ..model import Resource, ResourceGroup

_Cls = str | None
_KW = WebTestApp.KW
_KWS = WebTestApp.KWStatus


class ResourceAPI:
    base_url = "/api/resource"

    def __init__(self, client: WebTestApp | None = None):
        if client is None:
            client = fixture_value("ngw_webtest_app")
        assert isinstance(client, WebTestApp)
        self.client = client.with_url(self.base_url)

    @classmethod
    def build_url(cls, suffix: str) -> str:
        return f"{cls.base_url}/{suffix}"

    @classmethod
    def item_url(cls, id: int, suffix: str | None = None) -> str:
        return cls.build_url(str(id) + (f"/{suffix}" if suffix is not None else ""))

    def create(self, cls: _Cls, payload: dict, **kw: Unpack[_KW]) -> int:
        return self.create_request(cls, payload, status=201, **kw).json["id"]

    def create_request(self, cls: _Cls, payload: dict, **kw: Unpack[_KWS]) -> TestResponse:
        payload = dict(payload)
        if cls is not None:
            if (resource := payload.get("resource")) is not None:
                assert "cls" not in resource
            else:
                resource = payload["resource"] = {}
            resource["cls"] = cls
            if "parent" not in resource:
                resource["parent"] = self._parent()
            if "display_name" not in resource:
                resource["display_name"] = f"Test {token_urlsafe(6)}"
        return self.client.post("/", json=payload, **kw)

    def read(self, id: int, **kw: Unpack[_KW]) -> dict:
        return self.read_request(id, status=200, **kw).json

    def read_request(self, id: int, **kw: Unpack[_KWS]) -> TestResponse:
        return self.client.get(id, **kw)

    def update(self, id: int, payload: dict, **kw: Unpack[_KW]) -> None:
        self.update_request(id, payload=payload, status=200, **kw)

    def update_request(self, id: int, payload: dict, **kw: Unpack[_KWS]) -> TestResponse:
        return self.client.put(id, json=payload, **kw)

    def delete(self, id: int, **kw: Unpack[_KW]) -> None:
        self.delete_request(id, status=200, **kw)

    def delete_request(self, id: int, **kw: Unpack[_KWS]) -> TestResponse:
        return self.client.delete(id, **kw)

    def _parent(self) -> dict:
        return {"id": fixture_value("ngw_resource_group", "ngw_resource_group")}
