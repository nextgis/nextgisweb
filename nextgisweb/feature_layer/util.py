import re
from typing import Sequence

_suffix_pattern = re.compile(r"(.*)_(\d+)")


# Generate unique name for collection using number suffix
def unique_name(name: str, collection: Sequence[str]):
    if name not in collection:
        return name

    if m := _suffix_pattern.match(name):
        n = int(m[2]) + 1
    else:
        n = 1
    for i in range(n, n + len(collection) + 1):
        candidate = "%s_%d" % (name, i)
        if candidate not in collection:
            return candidate
