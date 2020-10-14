# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import logging

from ..command import Command
from ..models import DBSession

from .model import SCHEMA


logger = logging.getLogger(__name__)


@Command.registry.register
class CleanUpTableCommand():
    identity = 'vector_layer.cleanup_table'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--by-one', dest='by_one', action='store_true', default=False,
            help='drop one table per transaction')

    @classmethod
    def execute(cls, args, env):
        con = DBSession.connection()

        result = con.execute('''
            SELECT t.table_name
            FROM information_schema.tables t
            LEFT JOIN public.vector_layer v ON 'layer_' || v.tbl_uuid = t.table_name
            WHERE t.table_schema = '%s' AND t.table_name ~ '^layer_[0-9a-f]{32}$' AND v.id IS NULL
        ''' % SCHEMA)

        if not args.by_one:
            con.execute('BEGIN')

        count = 0
        try:
            for row in result:
                if args.by_one:
                    con.execute('BEGIN')
                con.execute('DROP TABLE "%s"."%s"' % (SCHEMA, row['table_name']))
                if args.by_one:
                    con.execute('COMMIT')
                count += 1
        except Exception:
            con.execute('ROLLBACK')
            raise
        else:
            if not args.by_one:
                con.execute('COMMIT')
        finally:
            logger.info('Deleted %d tables.' % count)
