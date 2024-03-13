import sys
from dataclasses import dataclass
from importlib import abc
from importlib.util import spec_from_loader
from pathlib import Path
from typing import Dict, Optional
from warnings import filterwarnings, warn

# Prevent warning about missing __init__.py in migration directory. Is's OK
# and migration directory is intended for migration scripts.
filterwarnings(
    "ignore",
    r"^Not importing.*/core/migration.*__init__\.py$",
    category=ImportWarning,
)

# Ignore osgeo imp module deprecation warning
filterwarnings("ignore", module="osgeo", category=DeprecationWarning)
import osgeo  # noqa: E402, F401


def module_path(module_name: str) -> Path:
    """Extract module's path from sys.modules and sys.meta_path

    Importlib's find_spec() is always importing the top-level package for
    modules which causes problems with single-component packages."""

    rest = module_name.split(".")
    root = rest.pop(0)

    if root_mod := sys.modules.get(root):
        root_path = Path(root_mod.__file__)
    else:
        for mp in sys.meta_path:
            if root_spec := mp.find_spec(root, None):
                root_path = Path(root_spec.origin)
                break
        else:
            raise ValueError(f"{module_name} not found")

    assert root_path.name == "__init__.py"
    root_path = root_path.parent

    return (root_path / "/".join(rest)) if rest else root_path


def module_from_stack(depth=0, skip=None):
    """Extract module name from stack"""

    if skip is not None:
        skip = tuple(m if m.endswith(".") else (m + ".") for m in skip)

    cur_depth = 2 + depth
    while True:
        fr = sys._getframe(cur_depth)
        mod = fr.f_globals["__name__"]
        mod_dot = mod + "."
        if (
            mod.startswith("_")
            or mod_dot.startswith("importlib.")
            or (skip and mod_dot.startswith(skip))
        ):
            cur_depth += 1
        else:
            return mod


@dataclass
class Record:
    name: str
    repl: str
    since: Optional[str] = None
    remove: Optional[str] = None


class Loader(abc.Loader):
    def __init__(self, rec):
        self.rec = rec

    def exec_module(self, module):
        code = f"from {self.rec.repl} import *"
        exec(code, module.__dict__)


class MetaPathFinder(abc.MetaPathFinder):
    registry: Dict[str, Record]

    def __init__(self):
        self.registry = dict()

    def substitute(self, name, repl, *, since=None, remove=None):
        rec = Record(name, repl, since=since, remove=remove)
        self.registry[rec.name] = rec

    def find_spec(self, fullname, path, target=None):
        try:
            rec = self.registry[fullname]
        except KeyError:
            return

        s = spec_from_loader(rec.name, loader=Loader(rec))
        m = (
            f"'{rec.name}' module has been deprecated by '{rec.repl}'"
            + (f" since {rec.since}" if rec.since else "")
            + (f", removing in {rec.remove}" if rec.remove else "")
        )

        warn(m, DeprecationWarning, stacklevel=2)
        return s


meta_path_finder = MetaPathFinder()
sys.meta_path.insert(0, meta_path_finder)
deprecate = meta_path_finder.substitute
