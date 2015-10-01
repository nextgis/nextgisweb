#!/usr/bin/python
# -*- coding: utf-8 -*-

__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD"

"""The base of the code was taken from featureserver project.
"""


from ..FeatureServer.Service.WFS import WFS
from ..FeatureServer.Service.GeoJSON import GeoJSON

from ..FeatureServer.WebFeatureService.Response.TransactionResponse import \
    TransactionResponse
from ..FeatureServer.WebFeatureService.Response.TransactionSummary import \
    TransactionSummary
from ..FeatureServer.WebFeatureService.Response.ActionResult import ActionResult

from ..FeatureServer.Exceptions.ExceptionReport import ExceptionReport
from ..FeatureServer.Exceptions.WebFeatureService.InvalidValueException import \
    InvalidValueException
from ..FeatureServer.Exceptions.ConnectionException import ConnectionException
from ..FeatureServer.Exceptions.LayerNotFoundException import \
    LayerNotFoundException
from ..FeatureServer.Exceptions.OperationParsingFailedException import \
    OperationParsingFailedException
from Exceptions.InvalidValueWFSException import InvalidValueWFSException
from ..FeatureServer.Exceptions.OperationProcessingFailedException import \
    OperationProcessingFailedException

from ..web_request.response import Response

class FeatureServerException(Exception):

    """Propagate exception raised by featureserver.
    """

    def __init__(self, mime, data, headers, encoding):
        self.mime = mime
        self.data = data
        self.headers = headers
        self.encoding = encoding


class Server (object):

    """The server manages the datasource list, and does the management of
       request input/output.  Handlers convert their specific internal
       representation to the parameters that dispatchRequest is expecting,
       then pass off to dispatchRequest. dispatchRequest turns the input
       parameters into a (content-type, response string) tuple, which the
       servers can then return to clients. It is possible to integrate
       FeatureServer into another content-serving framework like Django by
       simply creating your own datasources (passed to the init function)
       and calling the dispatchRequest method. The Server provides a classmethod
       to load datasources from a config file, which is the typical lightweight
       configuration method, but does use some amount of time at script startup.
       """

    def __init__(self, datasources, metadata={}, processes={}):
        self.datasources = datasources
        self.metadata = metadata
        self.processes = processes

    def dispatchRequest(self, base_path="", path_info="/", params={},
                        request_method="GET", post_data=None,  accepts=""):
        """Read in request data, and return a (content-type, response string) tuple. May
           raise an exception, which should be returned as a 500 error to the user."""
        response_code = "200 OK"
        host = base_path

        exceptionReport = ExceptionReport()

        if params.has_key("format") and params["format"] in \
                [u'application/json', u'text/javascript', u'json', u'geojson']:
            request = GeoJSON(self)
        else:
            request = WFS(self)

        response = []

        try:
            # import ipdb; ipdb.set_trace()
            request.parse(params, path_info, host, post_data, request_method)

            version = '1.0.0'   # Default version
            if len(request.actions) > 0:
                action = request.actions[0]
                if hasattr(action, 'version') and len(action.version) > 0:
                    version = action.version
                if (action.outputformat is not None) and len(action.outputformat) > 0:
                    params['outputformat'] = action.outputformat

                if hasattr(action, 'request') and action.request is not None:
                    if action.request == "GetCapabilities":
                        return request.getcapabilities(version)
                    elif action.request == "DescribeFeatureType":
                        return request.describefeaturetype(version)

                transactionResponse = TransactionResponse()
                transactionResponse.setSummary(TransactionSummary())

                for action in request.actions:
                    try:
                        datasource = self.datasources[action.layer]
                    except KeyError:
                        raise OperationParsingFailedException(message="Can't find layer '%s'" % (action.layer, ))

                    try:
                        datasource.begin()
                        method = getattr(datasource, action.method)

                        try:
                            result = method(action)
                            # import ipdb; ipdb.set_trace()
                            if isinstance(result, ActionResult):
                                transactionResponse.addResult(result)
                            elif result is not None:
                                response += result
                        except InvalidValueException as e:
                            exceptionReport.add(e)

                        datasource.commit()
                    except:
                        datasource.rollback()
                        raise

            if transactionResponse.summary.totalDeleted > 0 or \
                    transactionResponse.summary.totalInserted > 0 or \
                    transactionResponse.summary.totalUpdated > 0 or \
                    transactionResponse.summary.totalReplaced > 0:
                response = transactionResponse

        except ConnectionException as e:
            exceptionReport.add(e)
        except LayerNotFoundException as e:
            exceptionReport.add(e)
        except OperationParsingFailedException as e:
            exceptionReport.add(e)
        except OperationProcessingFailedException as e:
            exceptionReport.add(e)
        except InvalidValueWFSException as e:
            exceptionReport.add(e)

        if len(exceptionReport) > 0:
            mime, data, headers, encoding = \
                request.encode_exception_report(exceptionReport)
            exceptionReport.clear()
            raise FeatureServerException(mime, data, headers, encoding)
        else:
            params['version'] = version
            mime, data, headers, encoding = request.encode(response,
                                                           params=params)

        return Response(data=data, content_type=mime, headers=headers,
                        status_code=response_code, encoding=encoding)
