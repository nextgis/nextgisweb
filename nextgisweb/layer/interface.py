from zope.interface import Attribute

from ..resource import IResourceBase


class ISRS(IResourceBase):
    srs = Attribute(""" Spatial reference system """)
    srs_id = Attribute(""" SRS ID """)

    def is_srs_supported(self, srs):
        """ Check SRS supported """


class IBboxLayer(IResourceBase):
    extent = Attribute(""" Bounding box (extent) of a layer """)
