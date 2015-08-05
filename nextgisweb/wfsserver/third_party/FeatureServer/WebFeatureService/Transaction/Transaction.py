'''
Created on Oct 16, 2011

@author: michel
'''
import os
import sys
from lxml import etree
from lxml import objectify
from copy import deepcopy
from ....FeatureServer.WebFeatureService.Transaction.TransactionAction import TransactionAction


class Transaction(object):

    tree = None
    namespaces = {'gml': 'http://www.opengis.net/gml',
                  'fs': 'http://featureserver.org/fs'}

    def getActions(self):
        return self.tree

    def parse(self, xml):
        self.parser = objectify.makeparser(
            remove_blank_text=True, ns_clean=True)

        self.dom = etree.XML(xml, parser=self.parser)
        self.parseDOM()

    def parseDOM(self, node=None, transaction=None):

        if node == None:
            node = self.dom

        if transaction == None:
            transaction = TransactionAction(node)

        transaction_class = None

        for trans in node.iterchildren():
            if str(trans.xpath('local-name()')) == 'Insert':
                for child in trans.iterchildren():
                    transaction_class = self.getTransactionInstance(
                        str(trans.xpath('local-name()')), deepcopy(child))
                    transaction.appendChild(transaction_class)
            elif str(trans.xpath('local-name()')) == 'Update' or str(trans.xpath('local-name()')) == 'Delete':
                transaction_class = self.getTransactionInstance(
                    str(trans.xpath('local-name()')), deepcopy(trans))
                transaction.appendChild(transaction_class)

        self.tree = transaction

    def getTransactionInstance(self, transaction, node):
        try:
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            transaction_module = __import__(transaction, globals(), locals())
        except ImportError:
            raise Exception("Could not find transaction for %s" % transaction)

        transaction_func = getattr(transaction_module, transaction)
        return transaction_func(node)

    def render(self, datasource, node=None):
        if node == None:
            node = self.tree

        self.create(datasource, node)

    def create(self, datasource, node):
        for child in node:
            self.create(datasource, child)

        node.createStatement(datasource)

    def assemble(self, datasource, node, sql=''):
        for child in node:
            sql += self.assemble(datasource, child, sql)

        return sql

    def __str__(self, *args, **kwargs):
        return etree.tostring(self.dom, pretty_print=True)
