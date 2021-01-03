# -*- coding: utf-8 -*-
""" {
    "revision": "2bfa0530", "parents": ["00000000"],
    "message": "Create table foo_a"
} """

from __future__ import division, unicode_literals, print_function, absolute_import
from textwrap import dedent


def forward(ctx):
    ctx.execute(dedent("""
        CREATE TABLE foo_a (id INTEGER PRIMARY KEY);
    """))


def rewind(ctx):
    ctx.execute(dedent("""
        DROP TABLE foo_a;
    """))
