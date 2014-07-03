from FeatureServer.DataSource import DataSource
from vectorformats.Feature import Feature
from FeatureServer.Exceptions.NoGeometryException import NoGeometryException

import oauth2 as oauth

import urllib
import urlparse
import simplejson
import math

class Twitter (DataSource):

    api = None
    geo_keys = ['coordinates', 'geo', 'place']
    
    def __init__(self, name, consumer_key, consumer_secret, token_key, token_secret, srid_out = 4326, attributes="*", encoding = "utf-8", **args):
        DataSource.__init__(self, name, **args)
        self.consumer_key       = consumer_key
        self.consumer_secret    = consumer_secret
        self.token_key          = token_key
        self.token_secret       = token_secret
        self.srid_out           = srid_out
        self.encoding           = encoding
        self.attributes         = attributes

        self.api = TwitterAPI(self.consumer_key, self.consumer_secret, self.token_key, self.token_secret)

    def select (self, action):
        features = []
        if action.id is not None:
            content = self.api.request('https://api.twitter.com/1.1/statuses/show.json?include_my_retweet=true&include_entities=true&id=' + str(action.id), "GET")
            try:
                features.append(self.encode_tweet(simplejson.loads(content)))
            except Exception as e:
                ''' '''
        else:
            if hasattr(self, 'screen_name'):
                content = self.api.request('https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=' + self.screen_name, "GET")
                features = self.encode_user_tweets(simplejson.loads(content))
            elif hasattr(self, 'user_id'):
                content = self.api.request('https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=' + self.user_id, "GET")
                features = self.encode_user_tweets(simplejson.loads(content))
            else:
                params = {'count':'100'}
                geocode = ''
                if action.bbox:
                    # latitude, longitude
                    center = "%f,%f" % tuple([ (action.bbox[1] + action.bbox[3]) / 2, (action.bbox[0] + action.bbox[2]) / 2 ])

                    dLat = math.radians((action.bbox[3] - action.bbox[1]))
                    dLon = math.radians((action.bbox[2] - action.bbox[0]))
                    lat1 = math.radians(action.bbox[1])
                    lat2 = math.radians(action.bbox[3])

                    a = math.sin(dLat/2) * math.sin(dLat/2) + math.sin(dLon/2) * math.sin(dLon/2) * math.cos(lat1) * math.cos(lat2)
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                    d = 6371 * c

                    radius = "%ikm" % math.ceil(d/2)
                    params['geocode'] = center + ',' + radius
                
                params['q'] = self.query
                query = urllib.urlencode(params)
                        
                content = self.api.request('https://api.twitter.com/1.1/search/tweets.json?' + query, "GET")
                features = self.encode_search_tweets(simplejson.loads(content))
            
        return features

    
    def encode_search_tweets(self, tweets):
        features = []
        
        for tweet in tweets['statuses']:
            try:
                features.append(self.encode_tweet(tweet))
            except Exception as e:
                continue

        return features

    
    def encode_user_tweets(self, tweets):
        features = []
        for tweet in tweets:
            try:
                features.append(self.encode_tweet(tweet))
            except Exception as e:
                continue
        
        return features
    
    
    def encode_tweet(self, tweet):
        try:
            geom = self.get_geometry(tweet)
        except:
            raise
        
        props = {}
        node_names = self.get_node_names(tweet)
        
        for attribute in node_names:
            keys = attribute.split(".")
            value = tweet
            for key in keys:
                
                if value[key] is None:
                    break
                value = value[key]

            if type(value) is not dict and type(value) is not list:
                if type(value) is unicode:
                    props[attribute] = value
                else:
                    props[attribute] = unicode(str(value), self.encoding)
        
        return Feature( id=tweet["id"], geometry=geom, geometry_attr="geometry", srs=self.srid_out, props=props )
    

    def get_geometry(self, tweet):
        if tweet["coordinates"] is not None:
            return tweet["coordinates"]
        # geo field is deprecated. Should be removed
        if tweet["geo"] is not None:
            return tweet["geo"]
        if tweet["place"] is not None:
            if tweet["place"]["bounding_box"] is not None:
                return tweet["place"]["bounding_box"]

        raise NoGeometryException(locator="Twitter", layer=self.name)

    def get_node_names(self, tweet):
        nodes = []
        
        if self.attributes == '*':
            for key in tweet.keys():
                if key not in self.geo_keys:
                    childs = self.get_nodes(key, tweet[key], key)
                    nodes.extend(childs)
        else:
            nodes = self.attributes.split(",")

        return nodes

    def get_nodes(self, key, tweet, path):
        nodes = []
        
        if type(tweet) is dict:
            for key in tweet.keys():
                if key not in self.geo_keys:
                    childs = self.get_nodes(key, tweet[key], "%s.%s" % (path, key))
                    nodes.extend(childs)
        else:
            nodes.append("%s" % path)
        
        
        return nodes




class TwitterAPI(object):
    
    settings = {
        'request_token_url' : 'https://api.twitter.com/oauth/request_token',
        'authorize_url' : 'https://api.twitter.com/oauth/authorize',
        'access_token_url' : 'https://api.twitter.com/oauth/access_token'
    }
    
    client = None
    
    def __init__(self, consumer_key, consumer_secret, token_key, token_secret):
        consumer = oauth.Consumer(key = consumer_key, secret = consumer_secret)
        token = oauth.Token(key = token_key, secret = token_secret)
        
        self.client = oauth.Client(consumer, token)
    
    
    def request(self, url, http_method = "GET", post_body = "", http_headers = {}):
        resp, content = self.client.request(url, method = http_method, body = post_body, headers = http_headers)
        return content


