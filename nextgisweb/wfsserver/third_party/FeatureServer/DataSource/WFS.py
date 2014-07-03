__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: WFS.py 467 2008-05-18 06:02:16Z crschmidt $"

from FeatureServer.DataSource import DataSource
from FeatureServer.DataSource.OGR import OGR
from vectorformats.Feature import Feature
import urllib
import tempfile
import os

class WFS (DataSource):
    """Talks to a remote WFS instance, then uses the OGR 
       datasource to parse the returned data."""
    def __init__(self, name, url = None, typename = None,
                             version = "1.1.0", **args):
        DataSource.__init__(self, name, **args)
        self.url = url
        self.typename = typename
        self.version = version

    def select (self, action):
        param = {"VERSION"  : self.version,
                 "SERVICE"  : "WFS",
                 "REQUEST"  : "GetFeature",
                 "TYPENAME" : self.typename}

        if action.id is not None:
            param["FEATUREID"] = str(action.id)
        else:
            if action.bbox:
                param["BBOX"] = ",".join(map(str, action.bbox))
            if action.attributes:
                raise NotImplementedError("WFS attribute query")
            if action.maxfeatures:
                param["MAXFEATURES"] = str(action.maxfeatures)

        url = self.url
        if "?" not in url and "&" not in url: url += "?"
        url += urllib.urlencode(param)
        tmpfile, headers = urllib.urlretrieve(url)
        
        import ogr
        try:
            ds = OGR("GML", dsn = tmpfile, writable = 0)
            result = ds.select(action)
        except ogr.OGRError, E:
            raise Exception("OGR could not read the WFS result: %s. Data was: %s" % (E, open(tmpfile).read()))
        os.unlink(tmpfile)
        return result
