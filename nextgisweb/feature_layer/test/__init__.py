from __future__ import annotations

from collections.abc import Sequence
from contextlib import contextmanager
from typing import Literal
from unittest.mock import PropertyMock, patch

import pytest

from nextgisweb.env.test import fixture_value

from nextgisweb.pyramid.test import WebTestApp

from ..component import FeatureLayerComponent


class FeatureLayerAPI:
    def __init__(
        self, rid: int, *, client: WebTestApp | None = None, extensions: Sequence[str] = ()
    ) -> None:
        if not client:
            client = fixture_value("ngw_webtest_app")
        assert isinstance(client, WebTestApp)
        self.client = client.with_url(f"/api/resource/{rid}")
        self.resource_id = rid
        self.extensions = extensions

    def feature_list(
        self,
        *,
        version: int | None = None,
        status: WebTestApp.Status = None,
    ) -> list[dict]:
        query = dict(extensions=self.extensions, **({"version": version} if version else {}))
        return self.client.get("/feature/", query=query, status=status).json

    def feature_get(
        self,
        fid: int,
        *,
        version: int | None = None,
        status: WebTestApp.Status = None,
    ) -> dict:
        query = dict(extensions=self.extensions, **({"version": version} if version else {}))
        return self.client.get(f"/feature/{fid}", query=query, status=status).json

    def feature_create(self, feature: dict, *, status: WebTestApp.Status = None) -> dict:
        return self.client.post("/feature/", json=feature, status=status).json

    def feature_update(self, fid: int, feature: dict, *, status: WebTestApp.Status = None) -> dict:
        return self.client.put(f"/feature/{fid}", json=feature, status=status).json

    def versioning(self):
        data = self.client.get().json
        return data["feature_layer"]["versioning"]

    def transaction(self, *, epoch: int | None = None) -> TransactionAPI:
        epoch = epoch if epoch is not None else self.versioning().get("epoch")
        return TransactionAPI(self.resource_id, client=self.client, epoch=epoch)

    def changes(
        self,
        *,
        epoch: int | None = None,
        initial: int = 0,
        target: int | None = None,
        filter: Sequence[str] | None = None,
        status: WebTestApp.Status = None,
    ) -> list | dict:
        epoch = epoch if epoch is not None else self.versioning()["epoch"]
        query = dict(extensions=self.extensions, epoch=epoch, initial=initial)
        if target:
            query["target"] = target

        check_url = "/feature/changes/check"
        resp = self.client.get(check_url, query=query, status=status).json
        if status is not None and status != 200:
            return resp

        result = []
        next_url = resp.get("fetch").removeprefix("http://localhost")
        next_url = next_url.removeprefix(self.client.prefix)
        filter = tuple(filter) if filter is not None else None
        while next_url:
            resp = self.client.get(next_url).json
            next_url = None
            for i in resp:
                if i["action"] == "continue":
                    next_url = i["url"].removeprefix("http://localhost")
                    next_url = next_url.removeprefix(self.client.prefix)
                elif filter is None or i["action"].startswith(filter):
                    result.append(i)

        return result


class TransactionAPI:
    id: int | None = None

    def __init__(self, rid: int, *, client: WebTestApp, epoch: int | None) -> None:
        self.client = client.with_url(f"/api/resource/{rid}/feature/transaction")
        self.resource_id = rid
        self.epoch = epoch

    def __enter__(self) -> TransactionAPI:
        resp = self.client.post("/", json=dict(epoch=self.epoch) if self.epoch else {}).json
        self.id = resp.get("id")
        return self

    def put(self, seqnum: int, operation: dict | None, *, status: int | None = None):
        assert self.id
        self.client.put(self.id, json=[[seqnum, operation]], status=status)

    def commit(self) -> dict:
        assert self.id
        resp = self.client.post(self.id).json
        assert resp["status"] == "committed", resp
        return resp

    def commit_try(self, *, status: Literal["committed", "errors"] | None = None) -> dict:
        assert self.id
        resp = self.client.post(self.id).json
        if status is not None:
            assert resp["status"] == status
        return resp

    def commit_errors(self) -> list:
        return self.commit_try(status="errors")["errors"]

    def results(self, *, status: int | None = None) -> list[list]:
        assert self.id
        return self.client.get(self.id, status=status).json

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self.id:
            self.client.delete(self.id, status=(200, 404))


def parametrize_versioning():
    return pytest.mark.parametrize(
        "versioning",
        [
            pytest.param(False, id="versioning_disabled"),
            pytest.param(True, id="versioning_enabled"),
        ],
    )
