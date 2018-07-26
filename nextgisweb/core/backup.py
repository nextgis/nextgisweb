# -*- coding: utf-8 -*-
import os
import sys
import re
from os.path import join as ptjoin
from tempfile import NamedTemporaryFile
from zipfile import ZipFile
from shutil import copyfileobj

import sqlalchemy as sa
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
try:
    from pip._internal import main as pip_main
except ImportError:
    from pip import main as pip_main

from ..registry import registry_maker

Base = declarative_base()


class BackupObject(Base):
    __tablename__ = 'object'

    id = sa.Column(sa.Integer, primary_key=True)
    comp = sa.Column(sa.Text, nullable=False)
    identity = sa.Column(sa.Text, nullable=False)
    objkey = sa.Column(sa.Text)
    value = sa.Column(sa.Text)
    is_binary = sa.Column(sa.Boolean, nullable=False, default=False)
    binfn = sa.Column(sa.Text)


class BackupBase(object):
    registry = registry_maker()

    def __init__(self, comp, key, value=None, binfd=None):
        self.comp = comp
        self.key = key
        self.value = value
        self.binfd = binfd

    def is_binary(self):
        return False

    def backup(self):
        raise NotImplementedError("Backup for '%s' not implemented!" % self.identity)

    def restore(self):
        raise NotImplementedError("Restore for '%s' not implemented!" % self.identity)


@BackupBase.registry.register
class TableBackup(BackupBase):
    identity = 'table'

    def is_binary(self):
        return True

    def backup(self):
        conn = self.comp.env.core.DBSession.connection()
        cursor = conn.connection.cursor()

        cursor.copy_expert(
            "COPY %s TO STDOUT WITH CSV HEADER" % self.key,
            self.binfd
        )

    def restore(self):
        conn = self.comp.env.core.DBSession.connection()
        cursor = conn.connection.cursor()

        cursor.copy_expert(
            "COPY %s FROM STDIN WITH CSV HEADER" % self.key,
            self.binfd
        )


@BackupBase.registry.register
class SequenceBackup(BackupBase):
    identity = 'sequence'

    def backup(self):
        conn = self.comp.env.core.DBSession.connection()
        res = conn.execute("SELECT last_value FROM %s" % self.key)
        self.value = res.fetchone()[0]

    def restore(self):
        conn = self.comp.env.core.DBSession.connection()
        conn.execute("ALTER SEQUENCE %s RESTART WITH %s" % (
            self.key, int(self.value) + 1))


def backup(env, dst, nozip=False):
    if os.path.exists(dst):
        raise RuntimeError("Destination path already exists!")

    if nozip:
        os.mkdir(dst)
    else:
        zipf = ZipFile(dst, 'w', allowZip64=True)

    def openfile(fn):
        if nozip:
            return open(ptjoin(dst, fn), 'wb')
        else:
            tmpf = NamedTemporaryFile(delete=False)
            tmpf._target = fn
            return tmpf

    def putfile(fd):
        if nozip:
            pass
        else:
            fd.flush()
            fd.close()
            zipf.write(fd.name, fd._target)
            os.remove(fd.name)

    sqlitefile = openfile('db.sqlite')
    engine = sa.create_engine('sqlite:///' + sqlitefile.name)

    try:
        buf = openfile('requirements')
        stdout = sys.stdout
        sys.stdout = buf
        pip_main(['freeze', ])
        putfile(buf)
    finally:
        sys.stdout = stdout

    Base.metadata.bind = engine
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    seq = 0
    for comp in env.chain('initialize'):
        compdir = None

        for itm in comp.backup():
            seq += 1

            obj = BackupObject(
                id=seq, comp=comp.identity, identity=itm.identity,
                objkey=itm.key, is_binary=itm.is_binary()
            )

            if obj.is_binary:
                if compdir is None:
                    compdir = '%s.bin' % comp.identity
                    if nozip:
                        os.mkdir(ptjoin(dst, compdir))

                cleankey = re.sub('[^A-Za-z0-9]', '_', itm.key)[:64]

                obj.binfn = ptjoin(compdir, '%06d-%s' % (
                    obj.id, cleankey))

                itm.binfd = openfile(obj.binfn)

            itm.backup()
            obj.value = itm.value

            if obj.is_binary:
                putfile(itm.binfd)

            session.add(obj)

    session.commit()

    putfile(sqlitefile)


def restore(env, src):
    assert os.path.exists(src), "Path already exists!"

    usezip = not os.path.isdir(src)

    if usezip:
        zipf = ZipFile(src)
        sqlitefile = NamedTemporaryFile(delete=False)
        sqlitesrc = zipf.open('db.sqlite', 'r')
        copyfileobj(sqlitesrc, sqlitefile)
        sqlitefile.close()
        engine = sa.create_engine('sqlite:///' + sqlitefile.name)
    else:
        engine = sa.create_engine('sqlite:///' + ptjoin(src, 'db.sqlite'))

    Base.metadata.bind = engine
    session = sessionmaker(bind=engine)()

    conn = env.core.DBSession.connection()
    conn.execute("BEGIN")

    metadata = env.metadata()

    metadata.drop_all(conn)
    metadata.create_all(conn)

    for objrec in session.query(BackupObject):
        cls = BackupBase.registry[objrec.identity]

        if objrec.is_binary and usezip:
            binfd = zipf.open(objrec.binfn)
        elif objrec.is_binary and not usezip:
            binfd = open(ptjoin(src, objrec.binfn))
        else:
            binfd = None

        obj = cls(
            comp=env._components[objrec.comp],
            key=objrec.objkey,
            value=objrec.value,
            binfd=binfd
        )

        obj.restore()

        if binfd:
            binfd.close()

    if usezip:
        os.remove(sqlitefile.name)

    conn.execute("COMMIT")
