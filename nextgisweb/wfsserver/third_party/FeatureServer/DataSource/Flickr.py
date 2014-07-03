from FeatureServer.DataSource import DataSource
from vectorformats.Feature import Feature
from FeatureServer.Exceptions.NoGeometryException import NoGeometryException

import md5
import urllib
from lxml import etree

from StringIO import StringIO

class Flickr (DataSource):

    def __init__(self, name, api_key, api_secret, attributes = "*", srid_out = 4326, **args):
        DataSource.__init__(self, name, **args)
        self.api_key    = api_key
        self.api_secret = api_secret
        self.srid_out   = srid_out
        self.attributes = attributes
        
        self.api        = FlickrAPI(self.api_key, self.api_secret)
    
    def select (self, action):
        features = [] 
        if action.id is not None:
            data = self.api.request({'method':'flickr.photos.getInfo','photo_id':action.id})
            doc = etree.parse(StringIO(data)).getroot()
            photo = doc.xpath('/rsp/photo')[0]
            try:
                features.append(self.convert_photo(photo))
            except Exception as e:
                ''' '''
        
        else:
            params = {'method' : 'flickr.photos.search','extras':'description,owner_name,geo,tags,license'}
            
            if action.bbox:
                params['bbox'] = "%f,%f,%f,%f" % tuple(action.bbox)
            
            if hasattr(self, 'user_id'):
                params['user_id'] = self.user_id
                    
            if hasattr(self, 'tags'):
                params['tags'] = self.tags
                if hasattr(self, 'tag_mode'):
                    params['tag_mode'] = self.tag_mode
                else:
                    params['tag_mode'] = "any"
            
            data = self.api.request(params)
            
            doc = etree.parse(StringIO(data)).getroot()
            photos = [ photo for photo in doc.xpath('/rsp/photos')[0] ]
    
            for photo in photos:
                try:
                    features.append(self.convert_photo(photo))
                except Exception as e:
                    continue
        
        return features

    
    def convert_photo (self, xml):
        node_names = self.get_node_names(xml)
        
        props = {'img_url' : self.get_url(xml)}
        
        owners = xml.xpath('./owner')
        if len(owners) > 0:
            props['owner'] = owners[0].attrib['nsid']
            props['username'] = owners[0].attrib['username']
        for i in node_names:
            if i == "tags":
                tags = [ tag.text for tag in xml.xpath('./%s' % str(i))[0] ]
                props[i] = ",".join(tags)
                
            else:
                nodes = xml.xpath('./%s' % str(i))
                if len(nodes) > 0:
                    if len(list(nodes[0])) == 0:
                        if nodes[0].text is None:
                            props[i] = ""
                        else:
                            props[i] = nodes[0].text
        try:
            coordinates = self.get_coordinates(xml)
        except:
            raise
    
        return Feature(id=xml.attrib["id"], geometry={'type':"Point", 'coordinates':coordinates}, geometry_attr="geometry", srs=self.srid_out, props=props)

    def get_node_names(self, xml):
        if self.attributes == "*":
            props = [ child.tag for child in xml ]
        
            props.remove("location")
            props.remove("owner")
        else:
            props = self.attributes.split(',')
        
        return props

    def get_coordinates(self, xml):
        location = xml.xpath('./location')
        if len(location) > 0:
            loc = location[0]
            return [float(loc.attrib['longitude']), float(loc.attrib['latitude'])]
        
        if "longitude" in xml.attrib and "latitude" in xml.attrib:
            return [float(xml.attrib['longitude']), float(xml.attrib['latitude'])]


        raise NoGeometryException("Twitter", self.name)

    def get_url(self, xml):
        return "http://farm%s.static.flickr.com/%s/%s_%s_b.jpg" % (xml.attrib['farm'], xml.attrib['server'], xml.attrib['id'], xml.attrib['secret'])




class FlickrAPI:
    
    urls = {
        'xml' : 'http://api.flickr.com/services/rest/'
    }
    
    def __init__(self, api_key, api_secret):
        self.api_key    = api_key
        self.api_secret = api_secret

    def request(self, params = {}, format = "rest"):
        params['api_key'] = self.api_key
        params['format'] = format
        params['api_sig'] = self.signature(params)

        return urllib.urlopen(self.urls["xml"], urllib.urlencode(params)).read()


    def signature(self, params):
        items = []
        keys = params.keys()
        keys.sort()
        for key in keys:
            items.append("%s%s" % (key,params[key]))
        sign_string = "%s%s" % (self.api_secret, "".join(items))
        return md5.md5(sign_string).hexdigest()

    
    