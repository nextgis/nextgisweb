from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from importlib.util import find_spec
from os import scandir
from os.path import join as path_join
from pathlib import Path
from typing import List, Optional, Set

from ..package import pkginfo


@dataclass
class File:
    path: Path
    tags: Set[str]
    method: str
    mtime: float


@dataclass
class FileMapping:
    pattern: re.Pattern
    tags: Set[str]
    method: str


@dataclass
class DirectoryMapping:
    pattern: Optional[re.Pattern] = None
    tags: List[str] = field(default_factory=set)
    ignores: List[re.Pattern] = field(default_factory=list)
    dmap: List[DirectoryMapping] = field(default_factory=list)
    fmap: List[FileMapping] = field(default_factory=list)

    def ignore(self, pattern: str):
        self.ignores.append(re.compile(pattern))

    def dir(self, pattern: str, tags: Optional[Set[str]] = None) -> DirectoryMapping:
        tags = set() if tags is None else tags
        res = DirectoryMapping(re.compile(pattern), tags)
        self.dmap.append(res)
        return res

    def file(self, pattern: str, method: str, tags: Optional[Set[str]] = None) -> FileMapping:
        tags = set() if tags is None else tags
        res = FileMapping(re.compile(pattern), tags, method)
        self.fmap.append(res)
        return res

    def scan(self, base, path, tags=None):
        tags = set() if tags is None else tags
        tags = tags.union(self.tags)
        for entry in scandir(path_join(base, path)):
            p = path_join(path, entry.name)

            skip = False
            for i in self.ignores:
                if i.search(p):
                    skip = True
                    break
            if skip:
                continue

            if entry.is_dir():
                for dm in self.dmap:
                    if dm.pattern.search(p):
                        yield from dm.scan(base, p, tags)
                        break
                else:
                    yield from self.scan(base, p, tags)
            else:
                for fm in self.fmap:
                    if fm.pattern.search(p):
                        mtime = entry.stat().st_mtime
                        yield File(Path(p), tags.union(fm.tags), fm.method, mtime)
                        break


def load_extract_modules():
    if getattr(load_extract_modules, "_loaded", False):
        return
    for comp_id in pkginfo.components:
        mod = pkginfo.comp_mod(comp_id) + ".i18n"
        if mod not in sys.modules and find_spec(mod):
            __import__(mod)


def extract_component(comp_id):
    from babel.messages.catalog import Catalog, Message
    from babel.messages.extract import extract as babel_extract

    load_extract_modules()

    catalog_messages = dict()
    path = pkginfo.comp_path(comp_id)
    for f in extraction_root.scan(str(path), ""):
        with (path / f.path).open("rb") as fd:
            extracted = babel_extract(extraction_methods[f.method], fd)
            for ln, message, comments, context in extracted:
                key = (message, context) if isinstance(message, str) else (message[0], context)
                cat_msg = catalog_messages.get(key)
                if cat_msg is None:
                    cat_msg = catalog_messages[key] = Message(
                        message,
                        context=context,
                        flags=set(),
                        user_comments=comments,
                    )
                cat_msg.locations.append((str(f.path), ln))
                cat_msg.flags = cat_msg.flags.union(f.tags)

    loc_sort_key = lambda loc: loc[0] + ":" + "{:04d}".format(loc[1])
    msg_sort_key = lambda msg: loc_sort_key(msg.locations[0])

    sorting = list()
    for cm in catalog_messages.values():
        cm.locations.sort(key=loc_sort_key)
        sorting.append(cm)

    sorting.sort(key=msg_sort_key)

    cat = Catalog(domain=comp_id)
    for cm in sorting:
        cat.add(
            cm.id,
            context=cm.context,
            locations=cm.locations,
            flags=cm.flags,
        )

    return cat


extraction_root = DirectoryMapping()
extraction_root.ignore(r"[/^]__pycache__$")
extraction_root.ignore(r"^locale$")
extraction_root.file(r"\.py$", "python", {"server"})

extraction_methods = dict(
    javascript="babel.messages.extract:extract_javascript",
    handlebars="nextgisweb.env.i18n.handlebars:extract",
    mako="mako.ext.babelplugin:extract",
    python="babel.messages.extract:extract_python",
)
