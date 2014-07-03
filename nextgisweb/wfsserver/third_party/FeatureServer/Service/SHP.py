'''
Created on May 18, 2011

@author: michel
'''
from FeatureServer.Service.Request import Request
import vectorformats.Formats.SHP
import zipfile
import StringIO
from lxml import etree

class SHP(Request):
    def encode(self, result):
        shp = vectorformats.Formats.SHP.SHP(layername=self.datasources[0], datasource=self.service.datasources[self.datasources[0]])
        (shpBuffer, shxBuffer, dbfBuffer, prjBuffer)  = shp.encode(result)

        output = StringIO.StringIO()
        
        zip = zipfile.ZipFile(output, "w")
        
        zip.writestr('pois.shp', shpBuffer.getvalue())
        zip.writestr('pois.shx', shxBuffer.getvalue())
        zip.writestr('pois.dbf', dbfBuffer.getvalue())
        zip.writestr('pois.prj', prjBuffer.getvalue())
        
        
        
        readme = """
You have downloaded the POIs from the POI Service with the following Query:\n
%s\n
\n
The downloaded data underlie the OpenStreetMap copyrights and licenses.\n
http://www.openstreetmap.org/copyright
"""
        
        if hasattr(self.actions[0], 'filterEncoding'):
            readme = readme % str(self.actions[0].filterEncoding)
        else:
            if hasattr(self.actions[0], 'wfsrequest'):
                readme = readme % self.actions[0].wfsrequest.data
            else:
                readme = readme % 'unknown'
        
        zip.writestr('README.txt', readme)

        headers = {
            'Accept': '*/*',
            'Content-Disposition' : 'attachment; filename=poidownload.zip',
            'Content-Transfer-Encoding' : 'binary'
        }
        
        return ("application/zip;", output, headers, '')
        