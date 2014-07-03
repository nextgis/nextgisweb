__author__  = "MetaCarta"
__copyright__ = "Copyright (c) 2006-2008 MetaCarta"
__license__ = "Clear BSD" 
__version__ = "$Id: DBM.py 444 2008-03-19 01:35:35Z brentp $"

from FeatureServer.DataSource import DataSource
from FeatureServer.DataSource import Lock
from FeatureServer.Service.Action import Action
import anydbm
import UserDict

try:
    import cPickle as pickle
except ImportError:
    import pickle

class DBM (DataSource):
    """Simple datasource using the anydbm module and pickled datastructures."""
    def __init__(self, name, writable = 0, lockfile = None, unique = None, **args):
        DataSource.__init__(self, name, **args)
        self.db = Recno( args["file"] )
        self.append = self.db.append
        self.writable = int(writable)
        self.unique = unique
        if self.writable and lockfile:
            self.lock = Lock(lockfile)
        else:
            self.lock = None

    def __iter__ (self):
        return self.db.__iter__()

    def begin (self):
        if self.lock: return self.lock.lock()

    def commit (self):
        if hasattr(self.db, "sync"): self.db.sync()
        if self.lock: self.lock.unlock()

    def rollback (self):
        if self.lock: self.lock.unlock()

    def insert (self, action):
        if self.unique:
            action.id = self.insertUnique(action.feature)
        else:
            thunk = self.freeze_feature(action.feature)
            action.id = self.append(thunk)
        return self.select(action)
    
    def insertUnique(self, feature):
        if not feature.properties.has_key(self.unique):
           raise Exception("Unique key (%s) missing from feature." % self.unique)
        action = Action()
        action.attributes[self.unique] = feature.properties[self.unique]
        features = self.select(action)
        if len(features) > 1:
            raise Exception("There are two features with the unique key %s. Something's wrong with that." % feature.properties[self.unique])
        thunk = self.freeze_feature(feature)
        if len(features) == 0:
            return self.append(thunk)
        else:
            self.db[features[0].id] = thunk
            return features[0].id
    
    def update (self, action):
        self.db[action.id] = self.freeze_feature(action.feature)
        return self.select(action)
        
    def delete (self, action):
        feature = action.feature
        if action.id:
            del self.db[action.id]
        elif action.attributes:
            for feat in self.select(action):
                del self.db[feat.id]
        return []

    def select (self, action):
        def _overlap (a, b):
            return a[2] >= b[0] and \
                   b[2] >= a[0] and \
                   a[3] >= b[1] and \
                   b[3] >= a[1]

        if action.id is not None:
            feature = self.thaw_feature( self.db[action.id] )
            feature.id = action.id
            return [feature]
        else:
            result = []
            count  = action.maxfeatures
            counter = 0
            for id in self:
                if counter < action.startfeature:
                    counter += 1
                    continue
                thunk = self.db[id]
                feature = self.thaw_feature(thunk)
                feature.id = id
                if action.bbox and not _overlap(action.bbox, feature.bbox):
                    continue
                if action.attributes:
                    props = feature.properties
                    skip  = False
                    for key, val in action.attributes.items():
                        if (key not in props and val is not None) or \
                           (key in props and str(props[key]) != val):
                            skip = True
                            break
                    if skip: continue
                result.append(feature)
                if count is not None:
                    count -= 1
                    if not count: break
            return result

    def freeze_feature (self, feature):
        feature.bbox = feature.get_bbox()
        return pickle.dumps(feature)

    def thaw_feature (self, thunk):
        return pickle.loads(thunk)

class Recno (object):
    """Class to handle managment of the database file.""" 
    class Iterator (object):
        def __init__ (self, recno, idx = 0):
            self.recno = recno
            self.idx = self.recno.max + 1
            self.stopIdx = idx
        
        def __iter__ (self):
            return self

        def next (self):
            while True:
                self.idx -= 1
                if self.idx == 0 or self.idx == self.stopIdx:
                    raise StopIteration
                if not self.recno.has_key(self.idx):
                    continue
                return self.idx

    def __init__(self, file):
        self.file  = file
        self.max   = 0
        self.data  = None
        self.open()

    def __getitem__ (self, key):
        if not self.data:
            self.open()
        return self.data[str(key)]

    def __setitem__ (self, key, val):
        if not self.data:
            self.open()
        self.data[str(key)] = val
        if key > self.max: self.max = key

    def __delitem__ (self, key):
        if not self.data:
            self.open()
        del self.data[str(key)]

    def __len__ (self):
        if not self.data:
            self.open()
        return len(self.data)

    def __iter__ (self):
        return self.Iterator(self)

    def has_key (self, key):
        if not self.data:
            self.open()
        return self.data.has_key(str(key))

    def sync (self, reopen=True):
        if not self.data:
            self.open()
        self.data["_"] = str(self.max)
        del self.data
        self.data = None
        if reopen:
            self.data  = anydbm.open( self.file, "c" )

    def __del__ (self): 
        self.sync(False)

    def append (self, val):
        self.max += 1
        self.__setitem__(self.max, val)
        return self.max
    
    def open(self):
        self.data  = anydbm.open( self.file, "c" )
        if self.data.has_key("_"):
            self.max = int(self.data["_"])
