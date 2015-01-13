'''
Created on Oct 21, 2011

@author: michel
'''

class TransactionSummary(object):

    def __init__(self):
        self.totalInserted = 0
        self.totalDeleted = 0
        self.totalUpdated = 0
        self.totalReplaced = 0
    
    def increaseInserted(self, amount = 1):
        self.totalInserted += amount
    def increaseDeleted(self, amount = 1):
        self.totalDeleted += amount
    def increaseUpdated(self, amount = 1):
        self.totalUpdated += amount
    def increaseReplaced(self, amount = 1):
        self.totalReplaced += amount
    
    def getTotalInserted(self):
        return self.totalInserted
    def getTotalDeleted(self):
        return self.totalDeleted
    def getTotalUpdated(self):
        return self.totalUpdated
    def getTotalReplaced(self):
        return self.totalReplaced
        