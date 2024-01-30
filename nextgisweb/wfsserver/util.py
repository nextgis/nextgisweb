from xml.parsers.expat import ExpatError, ParserCreate

from lxml.etree import Element, tostring


def validate_tag(tag):
    try:
        el_validate = Element(tag)
    except ValueError:
        return False

    string_validate = tostring(el_validate, encoding="unicode")

    try:
        ParserCreate().Parse(string_validate)
    except ExpatError:
        return False

    return True
