__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: WFS.py 485 2008-05-18 10:51:09Z crschmidt $"

from FeatureServer.Service.Request import Request
import vectorformats.Formats.CSV


class CSV(Request):
    def encode(self, results):
        csv = vectorformats.Formats.CSV.CSV(layername=self.datasources[0])

        output = csv.encode(results)
        
        headers = {
            'Accept': '*/*',
            'Content-Disposition' : 'attachment; filename=poidownload.csv'
        }
        
        return ("application/octet-stream;", output, headers, '')

    def encode_exception_report(self, exceptionReport):
        csv = vectorformats.Formats.CSV.CSV()
        headers = {
            'Accept': '*/*',
            'Content-Disposition' : 'attachment; filename=poidownload.csv'
        }
        return ("application/octet-stream;", csv.encode_exception_report(exceptionReport), headers, '')