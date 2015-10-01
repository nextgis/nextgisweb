
from ...FeatureServer.Service.Action import Action
from ...FeatureServer.WebFeatureService.WFSRequest import WFSRequest
from ...web_request.handlers import ApplicationException
from ...FeatureServer.Exceptions.LayerNotFoundException import \
    LayerNotFoundException
from ...FeatureServer.Exceptions.NoLayerException import NoLayerException
from ...FeatureServer.Exceptions.InvalidValueWFSException import \
    InvalidValueWFSException


class Request (object):

    query_action_types = []

    def __init__(self, service):
        self.service = service
        # self.datasource  = None
        self.datasources = []
        self.actions = []
        self.host = None

    def encode_metadata(self, action):
        """Accepts an action, which is of method 'metadata' and
            may have one attribute, 'metadata', which includes
            information parsed by the service parse method. This
            should return a content-type, string tuple to be delivered
            as metadata to the Server for delivery to the client."""
        data = []
        if action.metadata:
            data.append(action.metadata)
        else:
            data.append("The following layers are available:")
            for layer in self.service.datasources:
                data.append(" * %s, %s/%s" % (layer, self.host, layer))
        return ("text/plain", "\n".join(data))

    def parse(self, params, path_info, host, post_data, request_method, format_obj=None):
        """Used by most of the subclasses without changes. Does general
            processing of request information using request method and
            path/parameter information, to build up a list of actions.
            Returns a list of Actions. If the first action in the list is
            of method 'metadata', encode_metadata is called (no datasource
            is touched), and encode_metadata is called. Otherwise, the actions
            are passed onto DataSources to create lists of Features."""
        self.host = host

        try:
            self.get_layer(path_info, params)
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
                a.method = "metadata"

            self.actions.append(a)
            return

        for datasource in self.datasources:
            if not self.service.datasources.has_key(datasource):
                raise LayerNotFoundException(
                    "Request", datasource, self.service.datasources.keys())

        action = Action()

        if request_method == "GET" or (request_method == "OPTIONS" and (post_data is None or len(post_data) <= 0)):
            action = self.get_select_action(path_info, params)
            if u'typename' in params:
                action.layer = params[u'typename']      # WFS 1.0.0
            if u'typenames' in params:
                action.layer = params[u'typenames']     # WFS 2.0.0

        elif request_method == "POST" or request_method == "PUT" or (request_method == "OPTIONS" and len(post_data) > 0):
            actions = self.handle_post(
                params, path_info, host, post_data, request_method,
                format_obj=format_obj)
            for action in actions:
                self.actions.append(action)

            return

        elif request_method == "DELETE":
            id = self.get_id_from_path_info(path_info)
            if id is not False:
                action.id = id
                action.method = "delete"

        self.actions.append(action)

    def get_id_from_path_info(self, path_info):
        """Pull Feature ID from path_info and return it."""
        try:
            path = path_info.split("/")
            path_pieces = path[-1].split(".")
            if len(path_pieces) > 1:
                return int(path_pieces[0])
            if path_pieces[0].isdigit():
                return int(path_pieces[0])
        except:
            return False
        return False

    def _set_bbox(self, action, bbox_value):
        """Analyze bbox parameter, set bbox attribute of the action
        """
        coords = bbox_value['coords']
        try:
            coords = map(float,coords)
        except ValueError:
            raise InvalidValueWFSException(
                message="Bbox values are't numeric: '%s'"
                % (coords, )
            )
        try:
            minX, minY, maxX, maxY = coords
        except ValueError:
            raise InvalidValueWFSException(
                message="Bbox values must be in format: minX,minY,maxX,maxY"
            )
        if minX > maxX or (minY > maxY):
            raise InvalidValueWFSException(
                message="Bbox values must be: minX<maxX,minY<maxY"
            )

        bbox = {'coords': coords}
        if 'SRS' in bbox_value:
            srs = bbox_value['SRS']
            bbox['srs_id'] = self._get_srid(srs)
        action.bbox = bbox
        return action

    def _get_srid(self, srs_description):
        # SRS ID stored as the digits after the last ":" character
        try:
            srs_id = int(srs_description.split(':')[-1])
        except ValueError:
            raise InvalidValueWFSException(message="Can't parse SRS: %s" % (srs, ))

        return srs_id

    def _set_maxfeatures(self, action, maxfeatures_value):
        """Analyze maxfeatures parameter, set maxfeatures
        attribute of the action
        """
        try:
            action.maxfeatures = int(maxfeatures_value)
        except ValueError:
            raise InvalidValueWFSException(
                message="Maxfeatures value isn't integer: '%s'"
                % (maxfeatures_value, )
            )
        return action

    def _set_startfeature(self, action, startfeature_value):
        """Analyze startfeature parameter, set startfeature
        attribute of the action
        """
        try:
            action.startfeature = int(startfeature_value)
        except ValueError:
            raise InvalidValueWFSException(
                message="Startfeature value isn't integer: '%s'"
                % (startfeature_value, )
            )
        return action

    def _set_filter(self, action, filter_value):
        """Analyze filters
        """
        action.wfsrequest = WFSRequest()
        try:
            action.wfsrequest.parse(filter_value)
        except Exception:
            ''' '''
        return action

    def get_select_action(self, path_info, params):
        """Generate a select action from a URL. Used unmodified by most
            subclasses. Handles attribute query by following the rules passed in
            the DS or in the request, bbox, maxfeatures, and startfeature by
            looking for the parameters in the params. """
        action = Action()
        action.method = "select"

        id = self.get_id_from_path_info(path_info)

        if id is not False:
            action.id = id
        else:
            for ds in self.datasources:
                # import ipdb; ipdb.set_trace()
                queryable = []
                # ds = self.service.datasources[self.datasource]
                if hasattr(ds, 'queryable'):
                    queryable = ds.queryable.split(",")
                elif params.has_key("queryable"):
                    queryable = params['queryable'].split(",")
                for key, value in params.items():
                    qtype = None
                    if "__" in key:
                        key, qtype = key.split("__")
                    if key == 'layer':
                        action.layer = value
                    elif key == 'bbox':
                        action = self._set_bbox(action, value)
                    elif key == 'srsname':
                        action.srsname = self._get_srid(value)
                    elif key in ["maxfeatures",     # WFS 1.0.0
                                 "count"            # WFS 2.0.0
                                 ]:
                        action = self._set_maxfeatures(action, value)
                    elif key in ["startfeature",    # WFS 1.0.0
                                 "startindex"       # WFS 2.0.0
                                 ]:
                        action = self._set_startfeature(action, value)
                    elif key == "request":
                        action.request = value
                    elif key == "version":
                        action.version = value
                    elif key == "filter":
                        action = self._set_filter(action, value)
                    elif key == 'outputformat':
                        action.outputformat = value
                    elif key in queryable or key.upper() in queryable and hasattr(self.service.datasources[ds], 'query_action_types'):
                        if qtype:
                            if qtype in self.service.datasources[ds].query_action_types:
                                action.attributes[key + '__' + qtype] = {
                                    'column': key, 'type': qtype, 'value': value}
                            else:
                                raise ApplicationException(
                                    "%s, %s, %s\nYou can't use %s on this layer. Available query action types are: \n%s" % (self, self.query_action_types, qtype,
                                                                                                                            qtype, ",".join(self.service.datasources[ds].query_action_types) or "None"))
                        else:
                            action.attributes[key + '__eq'] = {
                                'column': key, 'type': 'eq', 'value': value}
                            # action.attributes[key] = value
        return action

    def get_layer(self, path_info, params={}):
        """Return layer based on path, or raise a NoLayerException."""
        if params.has_key("typename"):      # WFS 1.0.0
            self.datasources = params["typename"].split(",")
            return

        if params.has_key("typenames"):     # WFS 2.0.0
            self.datasources = params["typenames"].split(",")
            return

        path = path_info.split("/")
        if len(path) > 1 and path_info != '/':
            # get_layer method can be called twice, so to prevent
            #    duplication of datasources, check it (DK)
            for source in path[1:]:
                if source not in self.datasources:
                    self.datasources.append(source)
        if params.has_key("layer"):
            # get_layer method can be called twice, so to prevent
            #    duplication of datasources, check it (DK)
            if params['layer'] not in self.datasources:
                self.datasources.append(params['layer'])

        if len(self.datasources) == 0:
            raise NoLayerException(
                "Request", message="Could not obtain data source from layer parameter or path info.")

    def handle_post(self, params, path_info, host, post_data,
                    request_method, format_obj=None):
        """Read data from the request and turn it into actions."""

        if format_obj:
            actions = []

            id = self.get_id_from_path_info(path_info)
            if id is not False:
                action = Action()
                action.method = "update"
                action.id = id

                features = format_obj.decode(post_data)

                action.feature = features[0]
                actions.append(action)

            else:
                if hasattr(format_obj, 'decode'):
                    features = format_obj.decode(post_data)

                    for feature in features:
                        action = Action()
                        action.method = "insert"
                        action.feature = feature
                        actions.append(action)

                elif hasattr(format_obj, 'parse'):
                    # import ipdb; ipdb.set_trace()
                    format_obj.parse(post_data)

                    if format_obj.isGetCapabilities():
                        return format_obj.getCapabilitiesAction()
                    elif format_obj.isDescribeFeatureType():
                        return format_obj.describeFeatureTypeAction()
                    elif format_obj.isGetFeature():
                        getFeatParams = format_obj.getFeatureParams()
                        return [self.get_select_action(path_info,
                                                       getFeatParams)]

                    # It is a transaction request.
                    transactions = format_obj.getActions()
                    if transactions is not None:
                        for transaction in transactions:
                            action = Action()
                            action.version = transaction.version = \
                                transactions.version
                            action.method = \
                                transaction.__class__.__name__.lower()
                            action.layer = transaction.getLayerName()
                            action.wfsrequest = transaction
                            action.handle = transaction.handle
                            actions.append(action)

            return actions
        else:
            raise Exception("Service type does not support adding features.")

    def encode(self, result):
        """Accepts a list of lists of features. Each list is generated by one datasource
            method call. Must return a (content-type, string) tuple."""
        results = [
            "Service type doesn't support displaying data, using naive display."""]
        for action in result:
            for i in action:
                data = i.to_dict()
                for key, value in data['properties'].items():
                    if value and isinstance(value, str):
                        data['properties'][key] = unicode(value, "utf-8")
                results.append(" * %s" % data)

        return ("text/plain", "\n".join(results), None)

    def getcapabilities(self, version): pass

    def describefeaturetype(self, version): pass
