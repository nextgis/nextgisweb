from docstring_parser import parse


class Docstring:
    short: str | None = None
    long: str | None = None
    returns: str | None = None
    params: dict[str, str]

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
