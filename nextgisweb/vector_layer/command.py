# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..command import Command
from ..models import DBSession

from .model import SCHEMA


@Command.registry.register
class CleanUpTableCommand():
    identity = 'vector_layer.cleanup_table'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        con = DBSession.connection()

        result = con.execute('''
            SELECT t.table_name
            FROM information_schema.tables t
            LEFT JOIN public.vector_layer v ON 'layer_' || v.tbl_uuid = t.table_name
            WHERE t.table_schema = '%s' AND v.id IS NULL
        ''' % SCHEMA)

        con.execute('BEGIN')
        try:
            for row in result.fetchall():
                con.execute('DROP TABLE "%s"."%s"' % (SCHEMA, row['table_name']))
        except Exception:
            con.execute('ROLLBACK')
            raise
        con.execute('COMMIT')
