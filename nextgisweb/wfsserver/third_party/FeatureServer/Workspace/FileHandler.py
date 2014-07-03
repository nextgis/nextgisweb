'''
Created on Mar 12, 2012

@author: michel
'''

import shortuuid, time

class FileHandler(object):
    
    __path = ""
    __expiration = float(7776000)

    def __init__(self, path, expiration=float(7776000)):
        self.__path = path
        self.__expiration = expiration
    
    def create(self, layer, filter, identifier=""):
        short = shortuuid.uuid()
        frw = open(self.__path, 'a')
        
        frw.write("%s,%s,%s,%s,%s\n" % (short, identifier, layer, filter, str(time.time())))
        frw.close()
        
        return short
    
    def removeExpired(self):
        now = time.time()
        
        fro = open(self.__path, 'rb')
        seekpoint = 0
        
        # read header line
        line = fro.readline()
        seekpoint = fro.tell()
        
        line = fro.readline()
        while line:
            data = line.split(',')
            
            if (now-float(data[4])) > self.__expiration:
                frw = open(self.__path, 'r+b')
                frw.seek(seekpoint, 0)
                
                chars = fro.readline()
                while chars:
                    frw.writelines(chars)
                    chars = fro.readline()
                
                frw.truncate()
                frw.close()
                fro.seek(seekpoint, 0)
            
            
            seekpoint = fro.tell()
            line = fro.readline()
            
        fro.close()
    
    def remove(self, key):
        fro = open(self.__path, 'rb')
        seekpoint = 0
        
        #read header line
        line = fro.readline()
        seekpoint = fro.tell()
        
        line = fro.readline()
        while line:
            data = line.split(',')
            if data[0] == key:
                frw = open(self.__path, 'r+b')
                frw.seek(seekpoint, 0)
                
                chars = fro.readline()
                while chars:
                    frw.writelines(chars)
                    chars = fro.readline()
                
                frw.truncate()
                frw.close()
            
            seekpoint = fro.tell()
            line = fro.readline()
            
        fro.close()
    
    def updateLastAccess(self, key):
        data = self.getByKey(key)
        if len(data) > 0:
            self.remove(key)
        
            frw = open(self.__path, 'a')
            frw.write("%s,%s,%s,%s,%s\n" % (data[0], data[1], data[2], data[3], str(time.time())))
            frw.close()
    
    def getByKey(self, key):
        fro = open(self.__path, 'r')
        line = fro.readline()
        while line:
            data = line.split(',')
            if data[0] == key:
                fro.close()
                return data
            
            line = fro.readline()
        
        fro.close()
        
        return []
    
    def checkIdentifier(self, identifier):
        workspaces = self.getByIdentifier(identifier)
        if len(workspaces) > 0:
            return False
        return True
    
    def getByIdentifier(self, identifier):
        workspaces = []
        
        fro = open(self.__path, 'r')
        line = fro.readline()
        while line:
            data = line.split(',')
            if data[1] == identifier:
                workspaces.append(data)
            
            line = fro.readline()
        
        fro.close()
        
        return workspaces
        