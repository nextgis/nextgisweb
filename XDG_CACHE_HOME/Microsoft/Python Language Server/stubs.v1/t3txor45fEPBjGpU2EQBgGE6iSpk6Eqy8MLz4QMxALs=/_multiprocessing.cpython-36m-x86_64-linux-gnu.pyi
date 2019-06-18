import builtins as _mod_builtins

class SemLock(_mod_builtins.object):
    'Semaphore/Mutex type'
    SEM_VALUE_MAX = 2147483647
    __class__ = SemLock
    def __enter__(self):
        'enter the semaphore/lock'
        return self
    
    def __exit__(self):
        'exit the semaphore/lock'
        pass
    
    def __init__(self, *args, **kwargs):
        'Semaphore/Mutex type'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    
    def _after_fork(self):
        'rezero the net acquisition count after fork()'
        pass
    
    def _count(self):
        'num of `acquire()`s minus num of `release()`s for this process'
        pass
    
    def _get_value(self):
        'get the value of the semaphore'
        pass
    
    def _is_mine(self):
        'whether the lock is owned by this thread'
        pass
    
    def _is_zero(self):
        'returns whether semaphore has value zero'
        pass
    
    @classmethod
    def _rebuild(cls):
        pass
    
    def acquire(self):
        'acquire the semaphore/lock'
        pass
    
    @property
    def handle(self):
        pass
    
    @property
    def kind(self):
        pass
    
    @property
    def maxvalue(self):
        pass
    
    @property
    def name(self):
        pass
    
    def release(self):
        'release the semaphore/lock'
        pass
    

__doc__ = None
__file__ = '/usr/lib/python3.6/lib-dynload/_multiprocessing.cpython-36m-x86_64-linux-gnu.so'
__name__ = '_multiprocessing'
__package__ = ''
flags = _mod_builtins.dict()
def sem_unlink():
    pass

