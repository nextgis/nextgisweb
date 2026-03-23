from nextgisweb.pyramid.view import ModelFactory

from .model import SRS, SRSID

srs_factory = ModelFactory(SRS, tdef=SRSID)
