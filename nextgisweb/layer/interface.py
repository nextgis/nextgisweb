from zope.interface import Attribute

from nextgisweb.resource import IResourceBase


class IBboxLayer(IResourceBase):
    extent = Attribute(""" Bounding box (extent) of a layer """)
