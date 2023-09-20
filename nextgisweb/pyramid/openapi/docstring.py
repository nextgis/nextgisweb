from typing import Dict, Optional

from docstring_parser import parse


class Doctring:
    short: Optional[str] = None
    long: Optional[str] = None
    returns: Optional[str] = None
    params: Dict[str, str]

    def __init__(self, func):
        doc = func.__doc__
        if doc:
            parsed = parse(doc)
            self.short = parsed.short_description
            self.long = parsed.long_description
            if returns := parsed.returns:
                self.returns = returns.description
            self.params = {
                p.arg_name: p.description for p in parsed.params if p.description is not None
            }
        else:
            self.params = dict()
