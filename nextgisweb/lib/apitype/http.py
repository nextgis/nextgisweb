from __future__ import annotations


class ContentType(str):
    EMPTY: ContentType
    JSON: ContentType
    TEXT: ContentType


ContentType.EMPTY = ContentType()
ContentType.JSON = ContentType("application/json")
ContentType.TEXT = ContentType("text/plain")


class StatusCode(int):
    EMPTY: StatusCode
    OK: StatusCode


StatusCode.EMPTY = StatusCode()
StatusCode.OK = StatusCode(200)
