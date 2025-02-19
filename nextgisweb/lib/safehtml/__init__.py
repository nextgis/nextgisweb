from copy import deepcopy

import nh3
from lxml.html import document_fromstring

url_schemes = nh3.ALLOWED_URL_SCHEMES | {"data"}
attributes = deepcopy(nh3.ALLOWED_ATTRIBUTES)
attributes["*"] = {"class"}


def sanitize(text, *, validate=False):
    if text is None:
        return None

    cleaned = nh3.clean(text, link_rel=None, attributes=attributes, url_schemes=url_schemes)

    if validate:
        # LXML should handle anything without exceptions
        doc = document_fromstring("<html><body>" + text + "</body></html>")
        doc_cleaned = document_fromstring("<html><body>" + cleaned + "</body></html>")
        if not compare(doc.body, doc_cleaned.body):
            raise ValueError

    return cleaned


def compare(a, b):
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
