import re

import nh3
from lxml.html import HtmlElement, document_fromstring

__all__ = ["URL_PATTERN", "sanitize"]

URL_SCHEMES = nh3.ALLOWED_URL_SCHEMES | {"e1c"}
URL_PATTERN = r"^(?:(?:(?:{})\:)|\/)(?:[^\s].*|)$".format(
    "|".join(re.escape(s) for s in sorted(URL_SCHEMES))
)

# Let "data" scheme pass inner filter, then handle on attribute_filter
URL_SCHEMES_WITH_DATA = URL_SCHEMES | {"data"}


def attribute_filter(tag: str, attr: str, value: str) -> str | None:
    if attr in ("href", "src") and value.startswith("data:"):
        if tag == "img" and attr == "src" and value.startswith("data:image/"):
            return value
        return None
    return value


def body_fromstring(text: str) -> HtmlElement:
    doc = document_fromstring("<html><body>" + text + "</body></html>")
    assert doc.body is not None
    return doc.body


def sanitize(text: str | None, *, validate: bool = False) -> str | None:
    if text is None:
        return None

    cleaned = nh3.clean(
        text,
        link_rel=None,
        url_schemes=URL_SCHEMES_WITH_DATA,
        attribute_filter=attribute_filter,
    )

    if validate:
        # LXML should handle anything without exceptions
        body = body_fromstring(text)
        body_cleaned = body_fromstring(cleaned)
        if not compare(body, body_cleaned):
            raise ValueError

    return cleaned


def compare(a: HtmlElement, b: HtmlElement) -> bool:
    if a.tag != b.tag or a.text != b.text or a.tail != b.tail:
        return False
    if len(a.attrib) != len(b.attrib):
        return False
    for k, v in a.attrib.items():
        if b.attrib.get(k) != v:
            return False
    if len(a) != len(b):
        return False
    for child1, child2 in zip(a, b):
        if not compare(child1, child2):
            return False
    return True
