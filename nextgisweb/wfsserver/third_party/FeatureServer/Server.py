#!/usr/bin/python
# -*- coding: utf-8 -*-

__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: Server.py 607 2009-04-27 15:53:15Z crschmidt $"

"""The base of the code was taken from featureserver project.

"""

class FeatureServerException(Exception):
    """Propagate exception raised by featureserver.
    """
    def __init__(self, mime, data, headers, encoding):
        self.mime = mime
        self.data = data
        self.headers = headers
        self.encoding = encoding

from ..FeatureServer.Service.WFS import WFS

from ..FeatureServer.WebFeatureService.Response.TransactionResponse import TransactionResponse
from ..FeatureServer.WebFeatureService.Response.TransactionSummary import TransactionSummary
from ..FeatureServer.WebFeatureService.Response.ActionResult import ActionResult

from ..FeatureServer.Exceptions.ExceptionReport import ExceptionReport
from ..FeatureServer.Exceptions.WebFeatureService.InvalidValueException import InvalidValueException
from ..FeatureServer.Exceptions.ConnectionException import ConnectionException
from ..FeatureServer.Exceptions.LayerNotFoundException import LayerNotFoundException

from ..web_request.response import Response


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
       
    def __init__ (self, datasources, metadata = {}, processes = {}):
        self.datasources   = datasources
        self.metadata      = metadata
        self.processes     = processes 
    
    def dispatchRequest (self, base_path="", path_info="/", params={}, request_method="GET", post_data=None,  accepts=""):
        """Read in request data, and return a (content-type, response string) tuple. May
           raise an exception, which should be returned as a 500 error to the user."""
        response_code = "200 OK"
        host = base_path

        exceptionReport = ExceptionReport()

        request = WFS(self)
        
        response = []

        try:
            request.parse(params, path_info, host, post_data, request_method)

            if len(request.actions) > 0 and hasattr(request.actions[0], 'request') and request.actions[0].request is not None:
                version = '1.0.0'
                if hasattr(request.actions[0], 'version') and len(request.actions[0].version) > 0:
                    version = request.actions[0].version
                
                if request.actions[0].request.lower() == "getcapabilities":
                    return request.getcapabilities(version)
                elif request.actions[0].request.lower() == "describefeaturetype":
                    return request.describefeaturetype(version)

            try:
                transactionResponse = TransactionResponse()
                transactionResponse.setSummary(TransactionSummary())

                for action in request.actions:
                    datasource = self.datasources[action.layer]

                    datasource.begin()

                    method = getattr(datasource, action.method)
                    try:
                        result = method(action)
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

            # NextgiswebDatasource doesn't have processes attribute for now,
            # so comment the lines:

            # if hasattr(datasource, 'processes'):
            #     for process in datasource.processes.split(","):
            #         if not self.processes.has_key(process):
            #             raise Exception("Process %s configured incorrectly. Possible processes: \n\n%s" % (process, ",".join(self.processes.keys() )))
            #         response = self.processes[process].dispatch(features=response, params=params)


            if transactionResponse.summary.totalDeleted > 0 or transactionResponse.summary.totalInserted > 0 or transactionResponse.summary.totalUpdated > 0 or transactionResponse.summary.totalReplaced > 0:
                response = transactionResponse

        except ConnectionException as e:
            exceptionReport.add(e)
        except LayerNotFoundException as e:
            exceptionReport.add(e)

        if len(exceptionReport) > 0:
            mime, data, headers, encoding = request.encode_exception_report(exceptionReport)
            exceptionReport.clear()
            raise FeatureServerException(mime, data, headers, encoding)
        else:
            mime, data, headers, encoding = request.encode(response)

        return Response(data=data, content_type=mime, headers=headers, status_code=response_code, encoding=encoding)     


