# -*- coding: utf-8 -*-
""" {
    "revision": "2bfa05b4", "parents": ["00000000"],
    "message": "Create table foo_b"
} """

from __future__ import division, unicode_literals, print_function, absolute_import
from textwrap import dedent


def forward(ctx):
    ctx.execute(dedent("""
        CREATE TABLE foo_b (id INTEGER PRIMARY KEY);
    """))


def rewind(ctx):
    ctx.execute(dedent("""
        DROP TABLE foo_b;
    """))
