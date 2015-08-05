'''
Created on Dec 10, 2011

@author: michel
'''
from ....FeatureServer.WebFeatureService.FilterEncoding.FilterEncoding import FilterEncoding


class Select(object):

    data = ""
    filter = None

    def __init__(self, data):
        self.data = data
        self.filter = FilterEncoding(self.data)
        self.filter.parse()

    def render(self, datasource):
        return self.filter.render(datasource)

    def getAttributes(self):
        return self.filter.getAttributes()
