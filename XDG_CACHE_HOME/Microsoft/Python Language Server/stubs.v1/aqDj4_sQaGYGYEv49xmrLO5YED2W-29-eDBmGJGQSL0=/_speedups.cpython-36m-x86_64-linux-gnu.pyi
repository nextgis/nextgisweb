import builtins as _mod_builtins

Encoder = _mod_builtins.type
Scanner = _mod_builtins.type
__doc__ = 'simplejson speedups\n'
__file__ = '/usr/lib/python3/dist-packages/simplejson/_speedups.cpython-36m-x86_64-linux-gnu.so'
__name__ = 'simplejson._speedups'
__package__ = 'simplejson'
def encode_basestring_ascii(basestring):
    'encode_basestring_ascii(basestring) -> str\n\nReturn an ASCII-only JSON representation of a Python string'
    return ''

make_encoder = Encoder()
make_scanner = Scanner()
def scanstring(basestring, end, encoding, strict=True):
    'scanstring(basestring, end, encoding, strict=True) -> (str, end)\n\nScan the string s for a JSON string. End is the index of the\ncharacter in s after the quote that started the JSON string.\nUnescapes all valid JSON string escape sequences and raises ValueError\non attempt to decode an invalid string. If strict is False then literal\ncontrol characters are allowed in the string.\n\nReturns a tuple of the decoded string and the index of the character in s\nafter the end quote.'
    return tuple()

