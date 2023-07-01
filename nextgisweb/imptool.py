from pathlib import Path
import sys
from dataclasses import dataclass
from importlib import abc
from importlib.util import spec_from_loader
from typing import Dict, Optional
from warnings import filterwarnings, warn

# Prevent warning about missing __init__.py in migration directory. Is's OK
# and migration directory is intended for migration scripts.
filterwarnings(
    'ignore', r"^Not importing.*/core/migration.*__init__\.py$",
    category=ImportWarning)


def module_path(module_name: str) -> Path:
    """Extract module's path from sys.modules and sys.meta_path
    Importlib's find_spec() is always importing the top-level package for
    modules which causes problems with single-component packages."""

    rest = module_name.split('.')
    root = rest.pop(0)

    if root_mod := sys.modules.get(root):
        root_path = Path(root_mod.__file__).parent
    else:
        for mp in sys.meta_path:
            if root_spec := mp.find_spec(root, None):
                root_path = Path(root_spec.origin).parent
                break
        else:
            raise ValueError(f"{module_name} not found")

    return (root_path / '/'.join(rest)) if rest else root_path


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


class NGWModuleDeprecation(UserWarning):
    pass


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
        m = f"'{rec.name}' module has been deprecated by '{rec.repl}'" + (
            f" since {rec.since}" if rec.since else "") + (
            f", removing in {rec.remove}" if rec.remove else "")

        warn(m, NGWModuleDeprecation, stacklevel=2)
        return s


meta_path_finder = MetaPathFinder()
sys.meta_path.insert(0, meta_path_finder)
deprecate = meta_path_finder.substitute

deprecate('nextgisweb.command', 'nextgisweb.env.legacy_command', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.component', 'nextgisweb.env', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.db', 'nextgisweb.lib.db', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.dynmenu', 'nextgisweb.lib.dynmenu', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.event', 'nextgisweb.lib.legacy_event', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.file_storage.models', 'nextgisweb.file_storage.model', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.layer.models', 'nextgisweb.layer.model', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.models', 'nextgisweb.env.model', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.package', 'nextgisweb.env.package', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.psection', 'nextgisweb.pyramid.psection', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.registry', 'nextgisweb.lib.registry', since='4.4.0.dev6', remove='4.5.0.dev0')
