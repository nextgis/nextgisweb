#!/usr/bin/python
__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: Server.py 607 2009-04-27 15:53:15Z crschmidt $"

import sys
import time
import os
import traceback
import ConfigParser

from lxml import etree
import cgi as cgimod

from ..FeatureServer.WebFeatureService.Response.TransactionResponse import TransactionResponse
from ..FeatureServer.WebFeatureService.Response.TransactionSummary import TransactionSummary
from ..FeatureServer.WebFeatureService.Response.ActionResult import ActionResult

from ..FeatureServer.Exceptions.ExceptionReport import ExceptionReport
from ..FeatureServer.Exceptions.WebFeatureService.InvalidValueException import InvalidValueException
from ..FeatureServer.Exceptions.ConnectionException import ConnectionException
from ..FeatureServer.Exceptions.LayerNotFoundException import LayerNotFoundException


from ..FeatureServer import Processing as FSProcessing
from ..web_request.response import Response

# First, check explicit FS_CONFIG env var
if 'FS_CONFIG' in os.environ:
    cfgfiles = os.environ['FS_CONFIG'].split(",")

# Otherwise, make some guesses.
else:
    # Windows doesn't always do the 'working directory' check correctly.
    if sys.platform == 'win32':
        workingdir = os.path.abspath(os.path.join(os.getcwd(), os.path.dirname(sys.argv[0])))
        cfgfiles = (os.path.join(workingdir, "featureserver.cfg"), os.path.join(workingdir,"..","featureserver.cfg"))
    else:
        cfgfiles = ("featureserver.cfg", os.path.join("..", "featureserver.cfg"), "/etc/featureserver.cfg")


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
    
    def _loadFromSection (cls, config, section, module_type, **objargs):
        type  = config.get(section, "type")
        module = __import__("%s.%s" % (module_type, type), globals(), locals(), type)
        objclass = getattr(module, type)
        for opt in config.options(section):
            objargs[opt] = config.get(section, opt)
        if module_type is 'DataSource':
            return objclass(section, **objargs)
        else:
            return objclass(**objargs)
    loadFromSection = classmethod(_loadFromSection)

    def _load (cls, *files):
        """Class method on Service class to load datasources
           and metadata from a configuration file."""
        config = ConfigParser.ConfigParser()
        config.read(files)
        
        metadata = {}
        if config.has_section("metadata"):
            for key in config.options("metadata"):
                metadata[key] = config.get("metadata", key)

        processes = {}
        datasources = {}
        for section in config.sections():
            if section == "metadata": continue
            if section.startswith("process_"):
                try:
                    processes[section[8:]] = FSProcessing.loadFromSection(config, section)
                except Exception, E:
                    pass 
            else:     
                datasources[section] = cls.loadFromSection(config, section, 'DataSource')

        return cls(datasources, metadata, processes)
    load = classmethod(_load)


    def dispatchRequest (self, base_path="", path_info="/", params={}, request_method = "GET", post_data = None,  accepts = ""):
        """Read in request data, and return a (content-type, response string) tuple. May
           raise an exception, which should be returned as a 500 error to the user."""
        response_code = "200 OK"
        host = base_path
        request = None
        content_types = {
          'application/vnd.google-earth.kml+xml': 'KML',
          'application/json': 'GeoJSON',
          'text/javascript': 'GeoJSON',
          'application/rss+xml': 'GeoRSS',
          'text/html': 'HTML',
          'osm': 'OSM',
          'gml': 'WFS',
          'wfs': 'WFS',
          'kml': 'KML',
          'json': 'GeoJSON',
          'georss': 'GeoRSS',
          'atom': 'GeoRSS',
          'html': 'HTML',
          'geojson':'GeoJSON',
          'shp': 'SHP',
          'csv': 'CSV',
          'gpx': 'GPX',
          'ov2': 'OV2',
          'sqlite': 'SQLite',
          'dxf' : 'DXF'
        }
        
        exceptionReport = ExceptionReport()
        
        path = path_info.split("/")
        
        found = False
        
        format = ""

        if params.has_key("format"):
            format = params['format']
            if format.lower() in content_types:
                format = content_types[format.lower()]
                found = True
        
        if not found and len(path) > 1:
            path_pieces = path[-1].split(".")
            if len(path_pieces) > 1:
                format = path_pieces[-1]
                if format.lower() in content_types:
                    format = content_types[format.lower()]
                    found = True
        
        if not found and not params.has_key("service") and post_data:
            try:
                dom = etree.XML(post_data)
                params['service'] = dom.get('service')
            except etree.ParseError: pass

        if not found and not params.has_key("version") and post_data:
            try:
                dom = etree.XML(post_data)
                params['version'] = dom.get('version')
            except etree.ParseError: pass
            
        if not found and not params.has_key("typename") and post_data:
            try:
                dom = etree.XML(post_data)
                for key, value in cgimod.parse_qsl(post_data, keep_blank_values=True):
                    if key.lower() == 'typename':
                        params['typename'] = value
            except etree.ParseError: pass

        if not found and params.has_key("service"):
            format = params['service']
            if format.lower() in content_types:
                format = content_types[format.lower()]
                found = True
        
        if not found and accepts:
            if accepts.lower() in content_types:
                format = content_types[accepts.lower()]
                found = True
        
        if not found and not format:
            if self.metadata.has_key("default_service"):
                format = self.metadata['default_service']
            else:    
                format = "WFS"
        
                
        #===============================================================================
        # (reflection) dynamic load of format class e.g. WFS, KML, etc.
        # for supported format see package 'Service'
        #       -----------           -------
        #       | Request | <|------- | WFS |
        #       -----------           -------
        #===============================================================================

        service_module = __import__("Service.%s" % format, globals(), locals(), format)
        service = getattr(service_module, format)
        request = service(self)
        
        response = []
        
        try:
            request.parse(params, path_info, host, post_data, request_method)
            
            # short circuit datasource where the first action is a metadata request. 
            if len(request.actions) and request.actions[0].method == "metadata": 
                return request.encode_metadata(request.actions[0])

            # short circuit datasource where a OGC WFS request is set
            # processing by service
            if len(request.actions) > 0 and hasattr(request.actions[0], 'request') and request.actions[0].request is not None:
                version = '1.0.0'
                if hasattr(request.actions[0], 'version') and len(request.actions[0].version) > 0:
                    version = request.actions[0].version
                
                if request.actions[0].request.lower() == "getcapabilities":
                    return getattr(request, request.actions[0].request.lower())(version)
                elif request.actions[0].request.lower() == "describefeaturetype":
                    return getattr(request, request.actions[0].request.lower())(version)

            datasource = self.datasources[request.datasources[0]]

            if request_method != "GET" and hasattr(datasource, 'processes'):
                raise Exception("You can't post data to a processed layer.")

        
            try:
                datasource.begin()

                if len(request.actions) > 0 and hasattr(request.actions[0], 'request') and request.actions[0].request is not None:
                    if request.actions[0].request.lower() == "getfeature":
                        ''' '''

                try:
                    transactionResponse = TransactionResponse()
                    transactionResponse.setSummary(TransactionSummary())

                    for action in request.actions:
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

                if hasattr(datasource, 'processes'):
                    for process in datasource.processes.split(","):
                        if not self.processes.has_key(process):
                            raise Exception("Process %s configured incorrectly. Possible processes: \n\n%s" % (process, ",".join(self.processes.keys() )))
                        response = self.processes[process].dispatch(features=response, params=params)
                if transactionResponse.summary.totalDeleted > 0 or transactionResponse.summary.totalInserted > 0 or transactionResponse.summary.totalUpdated > 0 or transactionResponse.summary.totalReplaced > 0:
                    response = transactionResponse

            except ConnectionException as e:
                exceptionReport.add(e)
    
        except LayerNotFoundException as e:
            exceptionReport.add(e)

        if len(exceptionReport) > 0:
            if self.metadata.has_key("default_exception"):
                service_module = __import__("Service.%s" % self.metadata['default_exception'], globals(), locals(), self.metadata['default_exception'])
                service = getattr(service_module, self.metadata['default_exception'])
                default_exception = service(self)
                
                if hasattr(default_exception, "default_exception"):
                    mime, data, headers, encoding = default_exception.encode_exception_report(exceptionReport)
                else:
                    raise Exception("Defined service of key 'default_exception' does not support encoding exception reports. Please use a supported service or disable this key.")
            else:
                # check if service supports exception encoding
                if hasattr(request, "encode_exception_report"):
                    mime, data, headers, encoding = request.encode_exception_report(exceptionReport)
                else:
                    # get default service and instantiate
                    service_module = __import__("Service.%s" % self.metadata['default_service'], globals(), locals(), self.metadata['default_service'])
                    service = getattr(service_module, self.metadata['default_service'])
                    default_service = service(self)
                
                    if hasattr(default_service, "encode_exception_report"):
                        mime, data, headers, encoding = default_service.encode_exception_report(exceptionReport)
                    else:
                        # load WFS for exception handling
                        from FeatureServer.Service.WFS import WFS
                        wfs_service = WFS(self)
                        mime, data, headers, encoding = wfs_service.encode_exception_report(exceptionReport)

        
        else:
            mime, data, headers, encoding = request.encode(response)

        return Response(data=data, content_type=mime, headers=headers, status_code=response_code, encoding=encoding)     


