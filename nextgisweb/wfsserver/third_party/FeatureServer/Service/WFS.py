__author__ = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD"
__version__ = "$Id: WFS.py 485 2008-05-18 10:51:09Z crschmidt $"

"""Most of the code is taken from featureserver project. Some simplifications of the code have done."""

from ...FeatureServer.Service.Request import Request
from ...FeatureServer.Service.Action import Action
from ...FeatureServer.Exceptions.NoLayerException import NoLayerException
from ...FeatureServer.Exceptions.WebFeatureService.InvalidValueException import WFSException

from ...vectorformats.Formats import WFS as WFSFormat
from ...FeatureServer.WebFeatureService.WFSRequest import WFSRequest
from ...FeatureServer.WebFeatureService.Response.TransactionResponse import TransactionResponse


class WFS(Request):

    def encode(self, results, params):
        wfs = WFSFormat.WFS(layername=self.datasources[0])

        if isinstance(results, TransactionResponse):
            return ("text/xml", wfs.encode_transaction(results), None, 'utf-8')

        output = wfs.encode(results, params=params)
        return ("text/xml", output, None, 'utf-8')

    def encode_exception_report(self, exceptionReport):
        wfs = WFSFormat.WFS()
        return ("text/xml", wfs.encode_exception_report(exceptionReport), None, 'utf-8')

    def parse(self, params, path_info, host, post_data, request_method):
        self.host = host

        try:
            self.get_layer(path_info, params)
            # TODO: this line is called twice
            # (here and on line 58: see Request.parse source).
            # It is the cause of duplication of datasources (see my comment in Request.get_layer) and therefore
            # it causes duplication of the sources in DescribeFeatureType response.
            # Investigate the problem. (DK)
        except NoLayerException:
            a = Action()

            if params.has_key('service') and params['service'].lower() == 'wfs':
                for layer in self.service.datasources:
                    self.datasources.append(layer)
                if params.has_key('request'):
                    a.request = params['request']
                else:
                    a.request = "GetCapabilities"
            else:
                raise WFSException(
                    "Service", None, 'Requested service is not recognized')

            self.actions.append(a)
            return

        wfsrequest = WFSRequest()
        try:
            Request.parse(
                self, params, path_info, host, post_data, request_method,
                format_obj=wfsrequest)
        except:
            raise

    def getcapabilities(self, version):
        wfs = WFSFormat.WFS(
            layers=self.datasources, datasources=self.service.datasources, host=self.host)
        result = wfs.getcapabilities(version)
        return ("text/xml", result)

    def describefeaturetype(self, version):
        wfs = WFSFormat.WFS(
            layers=self.datasources, datasources=self.service.datasources, host=self.host)
        result = wfs.describefeaturetype()
        return ("text/xml; subtype=gml/3.1.1", result)
