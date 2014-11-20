# The code is based on featureserver code.

import os
from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction
from lxml import etree
import re

class Update(TransactionAction):
    
    def __init__(self, node):
        super(Update, self).__init__(node)
        self.type = 'update'
        
    def createStatement(self, datasource):

        geom = self.node.xpath("//*[local-name() = 'Name' and text()='"+datasource.geom_col+"']/following-sibling::*[1]/*")
        geomData = ''
        if len(geom) > 0:
            geomData = etree.tostring(geom[0], pretty_print=True)

        result = {}

        properties = self.node.xpath("//*[local-name() = 'Property']")
        result = {prop.Name: prop.Value for prop in properties}

        filters = self.node.xpath("//*[local-name() = 'Filter']")
        if len(filters) != 1:
            raise NotImplementedError
        flt = filters[0].xpath("//*[local-name() = 'FeatureId']")
        if len(flt) != 1:
            raise NotImplementedError

        flt = flt[0].items()    # flt = [('fid', '1')]
        if len(flt) == 1:
            id = flt[0] [1]
            result['filter'] = {'id': id}
        else:
            raise NotImplementedError

        if result:
            self.setStatement(result)
            return

        self.setStatement(None)
