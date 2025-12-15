from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Literal


class FeatureLayerAPI:
    def __init__(self, client, rid: int, *, extensions: Sequence[str] = ()) -> None:
        self.client = client
        self.resource_id = rid
        self.base_url = f"/api/resource/{rid}"
        self.extensions = extensions

    def feature_list(
        self,
        *,
        extensions: Sequence[str] | None = None,
        version: int | None = None,
        params: Mapping[str, str] = {},
        status: int | None = None,
    ) -> list[dict]:
        extensions = extensions if extensions is not None else self.extensions
        params = dict(
            extensions=",".join(extensions),
            **({"version": str(version)} if version else {}),
            **params,
        )
        return self.client.get(
            f"{self.base_url}/feature/",
            params=params,
            status=status,
        ).json

    def feature_get(
        self,
        fid: int,
        *,
        extensions: Sequence[str] | None = None,
        version: int | None = None,
        params: Mapping[str, str] = {},
        status: int | None = None,
    ) -> dict:
        extensions = extensions if extensions is not None else self.extensions
        params = dict(
            extensions=",".join(extensions),
            **({"version": str(version)} if version else {}),
            **params,
        )
        return self.client.get(
            f"{self.base_url}/feature/{fid}",
            params=params,
            status=status,
        ).json

    def changes(
        self,
        *,
        epoch: int,
        initial: int = 0,
        target: int | None = None,
        extensions: Sequence[str] | None = None,
        filter: Sequence[str] | None = None,
        status: int | None = None,
    ) -> list | dict:
        extensions = extensions if extensions is not None else self.extensions
        params = dict(
            epoch=str(epoch),
            initial=str(initial),
            **({"target": str(target)} if target else {}),
            extensions=",".join(extensions),
        )

        check_url = f"/api/resource/{self.resource_id}/feature/changes/check"
        resp = self.client.get(check_url, params=params, status=status).json
        if status is not None and status != 200:
            return resp

        result = []
        next_url = resp.get("fetch")
        filter = tuple(filter) if filter is not None else None
        while next_url:
            resp = self.client.get(next_url).json
            next_url = None
            for i in resp:
                if i["action"] == "continue":
                    next_url = i["url"]
                elif filter is None or i["action"].startswith(filter):
                    result.append(i)

        return result


class TransactionAPI:
    id: int | None = None
    url: str | None = None

    def __init__(self, client, rid: int, *, epoch: int | None) -> None:
        self.client = client
        self.resource_id = rid
        self.epoch = epoch
        self.base_url = f"/api/resource/{rid}/feature/transaction"

    def __enter__(self) -> TransactionAPI:
        resp = self.client.post_json(
            f"{self.base_url}/",
            dict(epoch=self.epoch) if self.epoch else {},
        ).json

        self.id = resp.get("id")
        self.url = f"{self.base_url}/{self.id}"
        return self

    def put(self, seqnum: int, operation: dict | None, *, status: int | None = None):
        self.client.put_json(self.url, [[seqnum, operation]], status=status)

    def commit(self) -> dict:
        resp = self.client.post(self.url).json
        assert resp["status"] == "committed", resp
        return resp

    def commit_try(self, *, status: Literal["committed", "errors"] | None = None) -> dict:
        resp = self.client.post(self.url).json
        if status is not None:
            assert resp["status"] == status
        return resp

    def commit_errors(self) -> list:
        return self.commit_try(status="errors")["errors"]

    def results(self, *, status: int | None = None) -> list[list]:
        return self.client.get(self.url, status=status).json

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self.url:
            self.client.delete(self.url, status=(200, 404))
