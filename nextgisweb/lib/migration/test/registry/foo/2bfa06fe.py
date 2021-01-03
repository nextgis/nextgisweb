# -*- coding: utf-8 -*-
""" {
    "revision": "2bfa06fe", "parents": ["2bfa061e"]
} """

from __future__ import division, unicode_literals, print_function, absolute_import
from textwrap import dedent


def forward(ctx):
    ctx.execute(dedent("""
        ALTER TABLE foo RENAME TO foo_tmp;

        CREATE TABLE foo (
            id INTEGER PRIMARY KEY,
            value TEXT
        );

        INSERT INTO foo SELECT * FROM foo_tmp;
        DROP TABLE foo_tmp;
    """))


def rewind(ctx):
    ctx.execute(dedent("""
        ALTER TABLE foo RENAME TO foo_tmp;

        CREATE TABLE foo (
            id TEXT PRIMARY KEY,
            value TEXT
        );

        INSERT INTO foo SELECT * FROM foo_tmp;
        DROP TABLE foo_tmp;
    """))
