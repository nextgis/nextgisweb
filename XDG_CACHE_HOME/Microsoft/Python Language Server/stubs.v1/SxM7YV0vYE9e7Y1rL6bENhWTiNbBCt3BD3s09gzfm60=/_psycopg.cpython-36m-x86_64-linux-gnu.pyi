import builtins as _mod_builtins
import psycopg2 as _mod_psycopg2
import psycopg2.extensions as _mod_psycopg2_extensions

AsIs = _mod_psycopg2_extensions.AsIs
def BINARY():
    'psycopg type-casting object'
    pass

def BINARYARRAY():
    'psycopg type-casting object'
    pass

def BOOLEAN():
    'psycopg type-casting object'
    pass

def BOOLEANARRAY():
    'psycopg type-casting object'
    pass

Binary = _mod_psycopg2_extensions.Binary
Boolean = _mod_psycopg2_extensions.Boolean
def CIDRARRAY():
    'psycopg type-casting object'
    pass

Column = _mod_psycopg2_extensions.Column
def DATE():
    'psycopg type-casting object'
    pass

def DATEARRAY():
    'psycopg type-casting object'
    pass

def DATETIME():
    'psycopg type-casting object'
    pass

def DATETIMEARRAY():
    'psycopg type-casting object'
    pass

def DATETIMETZ():
    'psycopg type-casting object'
    pass

def DATETIMETZARRAY():
    'psycopg type-casting object'
    pass

def DECIMAL():
    'psycopg type-casting object'
    pass

def DECIMALARRAY():
    'psycopg type-casting object'
    pass

DataError = _mod_psycopg2.DataError
DatabaseError = _mod_psycopg2.DatabaseError
def Date(year, month, day):
    'Date(year, month, day) -> new date\n\nBuild an object holding a date value.'
    pass

def DateFromPy(datetimedate):
    'DateFromPy(datetime.date) -> new wrapper'
    pass

def DateFromTicks(ticks):
    'DateFromTicks(ticks) -> new date\n\nBuild an object holding a date value from the given ticks value.\n\nTicks are the number of seconds since the epoch; see the documentation of the standard Python time module for details).'
    pass

class Decimal(_mod_builtins.object):
    'Decimal(str) -> new Decimal adapter object'
    __class__ = Decimal
    def __conform__(self):
        pass
    
    def __init__(self, str):
        'Decimal(str) -> new Decimal adapter object'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    def __str__(self):
        'Return str(self).'
        return ''
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    
    @property
    def adapted(self):
        pass
    
    def getquoted(self):
        'getquoted() -> wrapped object value as SQL-quoted string'
        pass
    

Diagnostics = _mod_psycopg2_extensions.Diagnostics
Error = _mod_psycopg2.Error
def FLOAT():
    'psycopg type-casting object'
    pass

def FLOATARRAY():
    'psycopg type-casting object'
    pass

Float = _mod_psycopg2_extensions.Float
def INETARRAY():
    'psycopg type-casting object'
    pass

def INTEGER():
    'psycopg type-casting object'
    pass

def INTEGERARRAY():
    'psycopg type-casting object'
    pass

def INTERVAL():
    'psycopg type-casting object'
    pass

def INTERVALARRAY():
    'psycopg type-casting object'
    pass

ISQLQuote = _mod_psycopg2_extensions.ISQLQuote
Int = _mod_psycopg2_extensions.Int
IntegrityError = _mod_psycopg2.IntegrityError
InterfaceError = _mod_psycopg2.InterfaceError
InternalError = _mod_psycopg2.InternalError
def IntervalFromPy(datetimetimedelta):
    'IntervalFromPy(datetime.timedelta) -> new wrapper'
    pass

def LONGINTEGER():
    'psycopg type-casting object'
    pass

def LONGINTEGERARRAY():
    'psycopg type-casting object'
    pass

class List(_mod_builtins.object):
    'List(list) -> new list wrapper object'
    __class__ = List
    def __conform__(self):
        pass
    
    def __init__(self, list):
        'List(list) -> new list wrapper object'
        pass
    
    @classmethod
    def __init_subclass__(cls):
        'This method is called when a class is subclassed.\n\nThe default implementation does nothing. It may be\noverridden to extend subclasses.\n'
        return None
    
    def __str__(self):
        'Return str(self).'
        return ''
    
    @classmethod
    def __subclasshook__(cls, subclass):
        'Abstract classes can override this to customize issubclass().\n\nThis is invoked early on by abc.ABCMeta.__subclasscheck__().\nIt should return True, False or NotImplemented.  If it returns\nNotImplemented, the normal algorithm is used.  Otherwise, it\noverrides the normal algorithm (and the outcome is cached).\n'
        return False
    
    @property
    def adapted(self):
        pass
    
    def getquoted(self):
        'getquoted() -> wrapped object value as SQL date/time'
        pass
    
    def prepare(self, conn):
        'prepare(conn) -> set encoding to conn->encoding'
        pass
    

def MACADDRARRAY():
    'psycopg type-casting object'
    pass

def NUMBER():
    'psycopg type-casting object'
    pass

NotSupportedError = _mod_psycopg2.NotSupportedError
Notify = _mod_psycopg2_extensions.Notify
OperationalError = _mod_psycopg2.OperationalError
def PYDATE():
    'psycopg type-casting object'
    pass

def PYDATEARRAY():
    'psycopg type-casting object'
    pass

def PYDATETIME():
    'psycopg type-casting object'
    pass

def PYDATETIMEARRAY():
    'psycopg type-casting object'
    pass

def PYDATETIMETZ():
    'psycopg type-casting object'
    pass

def PYDATETIMETZARRAY():
    'psycopg type-casting object'
    pass

def PYINTERVAL():
    'psycopg type-casting object'
    pass

def PYINTERVALARRAY():
    'psycopg type-casting object'
    pass

def PYTIME():
    'psycopg type-casting object'
    pass

def PYTIMEARRAY():
    'psycopg type-casting object'
    pass

ProgrammingError = _mod_psycopg2.ProgrammingError
QueryCanceledError = _mod_psycopg2_extensions.QueryCanceledError
QuotedString = _mod_psycopg2_extensions.QuotedString
REPLICATION_LOGICAL = 87654321
REPLICATION_PHYSICAL = 12345678
def ROWID():
    'psycopg type-casting object'
    pass

def ROWIDARRAY():
    'psycopg type-casting object'
    pass

ReplicationConnection = _mod_psycopg2_extensions.ReplicationConnection
ReplicationCursor = _mod_psycopg2_extensions.ReplicationCursor
ReplicationMessage = _mod_psycopg2_extensions.ReplicationMessage
def STRING():
    'psycopg type-casting object'
    pass

def STRINGARRAY():
    'psycopg type-casting object'
    pass

def TIME():
    'psycopg type-casting object'
    pass

def TIMEARRAY():
    'psycopg type-casting object'
    pass

def Time(hour, minutes, seconds, tzinfo=None):
    'Time(hour, minutes, seconds, tzinfo=None) -> new time\n\nBuild an object holding a time value.'
    pass

def TimeFromPy(datetimetime):
    'TimeFromPy(datetime.time) -> new wrapper'
    pass

def TimeFromTicks(ticks):
    'TimeFromTicks(ticks) -> new time\n\nBuild an object holding a time value from the given ticks value.\n\nTicks are the number of seconds since the epoch; see the documentation of the standard Python time module for details).'
    pass

def Timestamp(year, month, day, hour, minutes, seconds, tzinfo=None):
    'Timestamp(year, month, day, hour, minutes, seconds, tzinfo=None) -> new timestamp\n\nBuild an object holding a timestamp value.'
    pass

def TimestampFromPy(datetimedatetime):
    'TimestampFromPy(datetime.datetime) -> new wrapper'
    pass

def TimestampFromTicks(ticks):
    'TimestampFromTicks(ticks) -> new timestamp\n\nBuild an object holding a timestamp value from the given ticks value.\n\nTicks are the number of seconds since the epoch; see the documentation of the standard Python time module for details).'
    pass

TransactionRollbackError = _mod_psycopg2_extensions.TransactionRollbackError
def UNICODE():
    'psycopg type-casting object'
    pass

def UNICODEARRAY():
    'psycopg type-casting object'
    pass

def UNKNOWN():
    'psycopg type-casting object'
    pass

Warning = _mod_psycopg2.Warning
Xid = _mod_psycopg2_extensions.Xid
__doc__ = 'psycopg PostgreSQL driver'
__file__ = '/usr/lib/python3/dist-packages/psycopg2/_psycopg.cpython-36m-x86_64-linux-gnu.so'
__libpq_version__ = 110001
__name__ = 'psycopg2._psycopg'
__package__ = 'psycopg2'
__version__ = '2.7.6.1 (dt dec pq3 ext lo64)'
def _connect(dsn, connection_factory=None, async=None):
    '_connect(dsn, [connection_factory], [async]) -- New database connection.\n\n'
    pass

def adapt(obj, protocol, alternate):
    'adapt(obj, protocol, alternate) -> object -- adapt obj to given protocol'
    pass

adapters = _mod_builtins.dict()
apilevel = '2.0'
binary_types = _mod_builtins.dict()
connection = _mod_psycopg2_extensions.connection
cursor = _mod_psycopg2_extensions.cursor
encodings = _mod_builtins.dict()
def get_wait_callback():
    'Return the currently registered wait callback.\n\nReturn `!None` if no callback is currently registered.\n'
    pass

def libpq_version():
    'Query actual libpq version loaded.'
    pass

lobject = _mod_psycopg2_extensions.lobject
def new_array_type(oids, name, baseobj):
    'new_array_type(oids, name, baseobj) -> new type object\n\nCreate a new binding object to parse an array.\n\nThe object can be used with `register_type()`.\n\n:Parameters:\n  * `oids`: Tuple of ``oid`` of the PostgreSQL types to convert.\n  * `name`: Name for the new type\n  * `baseobj`: Adapter to perform type conversion of a single array item.'
    pass

def new_type(oids, name, castobj):
    'new_type(oids, name, castobj) -> new type object\n\nCreate a new binding object. The object can be used with the\n`register_type()` function to bind PostgreSQL objects to python objects.\n\n:Parameters:\n  * `oids`: Tuple of ``oid`` of the PostgreSQL types to convert.\n  * `name`: Name for the new type\n  * `adapter`: Callable to perform type conversion.\n    It must have the signature ``fun(value, cur)`` where ``value`` is\n    the string representation returned by PostgreSQL (`!None` if ``NULL``)\n    and ``cur`` is the cursor from which data are read.'
    pass

paramstyle = 'pyformat'
def parse_dsn(dsn):
    'parse_dsn(dsn) -> dict -- parse a connection string into parameters'
    return dict()

def quote_ident(str, conn_or_curs):
    'quote_ident(str, conn_or_curs) -> str -- wrapper around PQescapeIdentifier\n\n:Parameters:\n  * `str`: A bytes or unicode object\n  * `conn_or_curs`: A connection or cursor, required'
    return ''

def register_type(obj, conn_or_curs):
    'register_type(obj, conn_or_curs) -> None -- register obj with psycopg type system\n\n:Parameters:\n  * `obj`: A type adapter created by `new_type()`\n  * `conn_or_curs`: A connection, cursor or None'
    pass

def set_wait_callback():
    'Register a callback function to block waiting for data.\n\nThe callback should have signature :samp:`fun({conn})` and\nis called to wait for data available whenever a blocking function from the\nlibpq is called.  Use `!set_wait_callback(None)` to revert to the\noriginal behaviour (i.e. using blocking libpq functions).\n\nThe function is an hook to allow coroutine-based libraries (such as\nEventlet_ or gevent_) to switch when Psycopg is blocked, allowing\nother coroutines to run concurrently.\n\nSee `~psycopg2.extras.wait_select()` for an example of a wait callback\nimplementation.\n\n.. _Eventlet: http://eventlet.net/\n.. _gevent: http://www.gevent.org/\n'
    pass

string_types = _mod_builtins.dict()
threadsafety = 2
