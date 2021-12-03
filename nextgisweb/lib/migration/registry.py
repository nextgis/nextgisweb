import re
import json
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from textwrap import dedent
from imp import load_source

from ..logging import logger
from .revision import REVID_ZERO
from .migration import Dependency, MigrationKey, Migration, InitialMigration


PLACEHOLDER = 'TODO: Write code here and remove this placeholder line!'


class PythonModuleMigration(Migration):

    _regexp_file = re.compile(r'^([0-9a-z]+)(?:\-.*)?\.py$')

    @classmethod
    def scandir(cls, component, path):
        for fn in path.glob('*.py'):
            m = cls._regexp_file.match(fn.name)
            if m and fn.is_file():
                revision = m.group(1).lower()
                yield PythonModuleMigration(component, revision, fn)
            else:
                logger.warn('Failed to identify python migration: {}'.format(fn))

    _regexp_meta = re.compile(r'^(?:\s*\#[^\n]*\n|\s*\n)*\"{3}\s*(\{.+\})\s*\"{3}\s*(.*)$', re.S)
    _regexp_forward = re.compile(r'def\s+forward\s*\(')
    _regexp_rewind = re.compile(r'def\s+rewind\s*\(')

    def __init__(self, component, revision, mpath):
        super().__init__(component, revision)
        self._mod_path = str(mpath)

        with mpath.open('r') as fd:
            m = self._regexp_meta.match(fd.read())

        if m:
            meta = _normalize_metadata(json.loads(m.group(1)), component, revision)
            body = m.group(2)
        else:
            raise ValueError("Metadata not found in {}".format(mpath))

        assert meta['revision'] == revision, "Revision mismatch!"

        self._parents = tuple(
            MigrationKey(component, r)
            for r in meta.get('parents', [REVID_ZERO]))
        self._date = meta.get('date')
        self._message = meta.get('message')
        self._dependencies = [
            (Dependency(i[0]), Dependency(i[1]))
            for i in meta.get('dependencies', ())]

        self._has_forward = self._regexp_forward.search(body) is not None
        self._has_rewind = self._regexp_rewind.search(body) is not None

    @classmethod
    def template(cls, path, revision, forward=True, rewind=True, **meta):
        meta['revision'] = revision

        message = meta.get('message')
        basename = revision + ('-' + _slugify(message) if message else '')

        fwpath = path / '{}.py'.format(basename)
        assert not fwpath.exists()
        with fwpath.open('w') as fd:
            fd.write("\"\"\" {\n" + _metadata_to_jskeys(meta, '    ') + "\n} \"\"\"\n")
            if forward:
                fd.write('\n' + dedent("""
                    def forward(ctx):
                        pass  # {}
                """.format(PLACEHOLDER)))

            if rewind:
                fd.write('\n' + dedent("""
                    def rewind(ctx):
                        pass  # {}
                """.format(PLACEHOLDER)))

        return (fwpath, )

    @property
    def forward_callable(self):
        return getattr(load_source('', self._mod_path), 'forward')

    @property
    def rewind_callable(self):
        return getattr(load_source('', self._mod_path), 'rewind')


class SQLScriptMigration(Migration):

    _regexp_file = re.compile(r'^([0-9a-z]+)(?:\-.*)?\.fw\.sql$')

    @classmethod
    def scandir(cls, component, path):
        for fn in path.glob('*.fw.sql'):
            m = cls._regexp_file.match(fn.name)
            if m:
                revision = m.group(1).lower()
                migration = SQLScriptMigration(component, revision, fn)
                yield migration
            else:
                logger.warn('Failed to identify SQL script migration: {}'.format(fn))

    @classmethod
    def template(cls, path, revision, forward=True, rewind=True, **meta):
        meta['revision'] = revision

        outfiles = list()
        message = meta.get('message')
        basename = revision + ('-' + _slugify(message) if message else '')

        fwpath = path / '{}.fw.sql'.format(basename)
        assert not fwpath.exists()
        with fwpath.open('w') as fd:
            fd.write("/*** {\n" + _metadata_to_jskeys(meta, '    ') + "\n} ***/\n\n")
            if forward:
                fd.write('-- {}\n'.format(PLACEHOLDER))
            outfiles.append(fwpath)

        if rewind:
            rwpath = path / '{}.rw.sql'.format(basename)
            assert not rwpath.exists()
            with rwpath.open('w') as fd:
                fd.write("/*** { " + _metadata_to_jskeys(
                    dict(revision=revision), ''
                ) + " } ***/\n\n")
                fd.write('-- {}\n'.format(PLACEHOLDER))
            outfiles.append(rwpath)

        return tuple(outfiles)

    _regexp_meta = re.compile(r'^\/\*{3}\s*(\{.+\})\s*\*{3}\/\s*(.*)$', re.I + re.S)

    def __init__(self, component, revision, fwpath):
        super().__init__(component, revision)
        self.fwpath = fwpath

        def _readfile(fpath, reverse=False):
            with fpath.open('r') as fd:
                fcontent = fd.read()

            m = self._regexp_meta.match(fcontent)
            if m:
                mjson, body = m.group(1), m.group(2)
                meta = _normalize_metadata(json.loads(mjson), component, revision)
                return meta, body

        fwmeta, fwbody = _readfile(fwpath, False)
        assert revision == fwmeta['revision']

        self._parents = tuple(
            MigrationKey(component, r)
            for r in fwmeta.get('parents', (REVID_ZERO, )))

        self._date = fwmeta.get('date')
        self._message = fwmeta.get('message')
        self._dependencies = [
            (Dependency(i[0]), Dependency(i[1]))
            for i in fwmeta.get('dependencies', ())]

        self._has_forward = True

        revpath = Path(re.sub(r'\.fw\.sql$', '.rw.sql', str(fwpath)))
        self._has_rewind = revpath.is_file()
        if self._has_rewind:
            self.rwpath = revpath
            revmeta, revbody = _readfile(revpath, True)
            assert tuple(revmeta.keys()) == ('revision', )
            assert revision == revmeta['revision']
        else:
            self.rwpath = None

    def forward_script(self):
        with self.fwpath.open('r') as fd:
            return fd.read()

    def rewind_script(self):
        with self.rwpath.open('r') as fd:
            return fd.read()


class Registry(object):

    def __init__(self):
        self._all_migrations = dict()
        self._by_component = dict()
        self._validated = False

    def add(self, migration):
        assert not self._validated, "Registry already has validated!"

        assert migration.key not in self._all_migrations
        self._all_migrations[migration.key] = migration

        cmigs = self._by_component.setdefault(migration.component, dict())
        assert migration.key not in cmigs
        cmigs[migration.key] = migration

        for p in migration.parents:
            if p.revision == REVID_ZERO:
                if MigrationKey(migration.component, REVID_ZERO) not in cmigs:
                    self.add(InitialMigration(migration.component))

        for e, d in migration.dependencies:
            if d.revision == REVID_ZERO:
                dmigs = self._by_component.setdefault(d.component, dict())
                if MigrationKey(d.component, REVID_ZERO) not in dmigs:
                    self.add(InitialMigration(d.component))

    def scandir(self, component, path):
        for c in (PythonModuleMigration, SQLScriptMigration):
            for m in c.scandir(component, path):
                self.add(m)

    def validate(self):
        mkeys = list(self._all_migrations.keys())
        mkeys.sort(key=lambda i: i.revision)
        self._all_migrations = OrderedDict(((k, self._all_migrations[k]) for k in mkeys))
        self._validated = True


def _normalize_metadata(value, component, revision):
    result = dict()
    for k, v in value.items():
        k = k.lower()
        if k == 'revision':
            _validate_revision(v)
        elif k == 'parents':
            if isinstance(v, str):
                v = (v, )
            elif isinstance(v, list):
                v = tuple(v)
            for pr in v:
                _validate_revision(pr)
        elif k == 'message':
            assert isinstance(v, str)
        elif k == 'date':
            assert isinstance(v, str)
        elif k == 'dependencies':
            if isinstance(v, list):
                v = tuple(v)
            assert isinstance(v, tuple)
            deps = list()
            for d in v:
                if isinstance(d, str):
                    d = ('this', d)
                if isinstance(d, list):
                    d = tuple(d)
                assert isinstance(d, tuple)
                assert len(d) == 2
                nd = list()
                for s in d:
                    if s == 'this':
                        s = '{}=={}'.format(component, revision)
                    else:
                        _validate_revspec(s)
                    nd.append(s)

                deps.append(tuple(nd))
            v = tuple(deps)
        else:
            raise ValueError()
        result[k] = v
    return result


def _validate_revision(value):
    assert isinstance(value, str)
    assert re.match(r'^[0-9a-f]{8}$', value) is not None


def _validate_revspec(value):
    assert isinstance(value, str)
    assert re.match(r'^\w+==[0-9a-f]{8}$', value) is not None


def _metadata_to_jskeys(value, indent='    '):
    def _jskeys(*pairs):
        od = OrderedDict()
        for k, v in pairs:
            if isinstance(v, datetime):
                v = v.replace(microsecond=0).isoformat()
            od[k] = v
        return json.dumps(od, )[1:-1]

    lines = list()
    rk = set(value.keys())

    for group in (
        ('revision', 'parents', ),
        ('date', ), ('message', ),
        ('dependencies', ),
    ):
        pk = [k for k in group if k in value]
        if len(pk) > 0:
            rk.difference_update(pk)
            lines.append(_jskeys(*[(k, value[k]) for k in pk]))

    return ',\n'.join(((indent + l) for l in lines))


def _slugify(message):
    result = message.lower()
    result = re.sub(r'\W', '-', result)
    result = re.sub(r'\-+', '-', result)
    result = re.sub(r'^\-', '', result)
    result = re.sub(r'\-$', '', result)
    return result
