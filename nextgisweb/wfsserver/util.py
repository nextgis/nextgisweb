from lxml.etree import Element


def validate_tag(tag):
    try:
        Element(tag)
    except ValueError:
        return False
    else:
        return True
