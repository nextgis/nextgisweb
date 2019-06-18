import builtins as _mod_builtins

PyCFuncPtr = PyCFuncPtrType()
class ArgumentError(_mod_builtins.Exception):
    __class__ = ArgumentError
    __dict__ = {}
    def __init__(self, *args, **kwargs):
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    __module__ = 'ctypes'
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    
    @property
    def __weakref__(self):
        'list of weak references to the object (if defined)'
        pass
    

class Array(_CData):
    'XXX to be provided'
    __class__ = Array
    def __delitem__(self, key):
        'Delete self[key].'
        return None
    
    def __getitem__(self, key):
        'Return self[key].'
        pass
    
    def __init__(self, *args, **kwargs):
        'XXX to be provided'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    def __len__(self):
        'Return len(self).'
        return 0
    
    def __setitem__(self, key, value):
        'Set self[key] to value.'
        return None
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    

CFuncPtr = PyCFuncPtr()
FUNCFLAG_CDECL = 1
FUNCFLAG_PYTHONAPI = 4
FUNCFLAG_USE_ERRNO = 8
FUNCFLAG_USE_LASTERROR = 16
def POINTER():
    pass

def PyObj_FromPtr():
    pass

def Py_DECREF():
    pass

def Py_INCREF():
    pass

RTLD_GLOBAL = 256
RTLD_LOCAL = 0
class Structure(_CData):
    'Structure base class'
    __class__ = Structure
    def __init__(self, *args, **kwargs):
        'Structure base class'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    

class Union(_CData):
    'Union base class'
    __class__ = Union
    def __init__(self, *args, **kwargs):
        'Union base class'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    

class _Pointer(_CData):
    'XXX to be provided'
    def __bool__(self):
        'self != 0'
        return False
    
    __class__ = _Pointer
    def __delitem__(self, key):
        'Delete self[key].'
        return None
    
    def __getitem__(self, key):
        'Return self[key].'
        pass
    
    def __init__(self, *args, **kwargs):
        'XXX to be provided'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    def __setitem__(self, key, value):
        'Set self[key] to value.'
        return None
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    
    @property
    def contents(self):
        'the object this pointer points to (read-write)'
        pass
    

class _SimpleCData(_CData):
    'XXX to be provided'
    def __bool__(self):
        'self != 0'
        return False
    
    __class__ = _SimpleCData
    def __ctypes_from_outparam__(self):
        pass
    
    def __init__(self, *args, **kwargs):
        'XXX to be provided'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    def __repr__(self):
        'Return repr(self).'
        return ''
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    
    @property
    def value(self):
        'current value'
        pass
    

__doc__ = 'Create and manipulate C compatible data types in Python.'
__file__ = '/usr/lib/python3.6/lib-dynload/_ctypes.cpython-36m-x86_64-linux-gnu.so'
__name__ = '_ctypes'
__package__ = ''
__version__ = '1.1.0'
_cast_addr = 140313406748296
_memmove_addr = 140313441381072
_memset_addr = 4321312
_pointer_type_cache = _mod_builtins.dict()
_string_at_addr = 140313406735818
def _unpickle():
    pass

_wstring_at_addr = 140313406734696
def addressof(Cinstance):
    'addressof(C instance) -> integer\nReturn the address of the C instance internal buffer'
    return 1

def alignment(Cinstance):
    'alignment(C type) -> integer\nalignment(C instance) -> integer\nReturn the alignment requirements of a C instance'
    return 1

def buffer_info():
    'Return buffer interface information'
    pass

def byref(Cinstance, offset=0):
    'byref(C instance[, offset=0]) -> byref-object\nReturn a pointer lookalike to a C instance, only usable\nas function argument'
    pass

def call_cdeclfunction():
    pass

def call_function():
    pass

def dlclose():
    'dlclose a library'
    pass

def dlopen(name, flag={RTLD_GLOBAL|RTLD_LOCAL}):
    'dlopen(name, flag={RTLD_GLOBAL|RTLD_LOCAL}) open a shared library'
    pass

def dlsym():
    'find symbol in shared library'
    pass

def get_errno():
    pass

def pointer():
    pass

def resize():
    'Resize the memory buffer of a ctypes instance'
    pass

def set_errno():
    pass

def sizeof(Cinstance):
    'sizeof(C type) -> integer\nsizeof(C instance) -> integer\nReturn the size in bytes of a C instance'
    return 1

