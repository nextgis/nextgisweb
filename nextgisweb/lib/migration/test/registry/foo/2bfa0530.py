""" {
    "revision": "2bfa0530", "parents": ["00000000"],
    "message": "Create table foo_a"
} """

from textwrap import dedent


def forward(ctx):
    ctx.execute(dedent("""
        CREATE TABLE foo_a (id INTEGER PRIMARY KEY);
    """))


def rewind(ctx):
    ctx.execute(dedent("""
        DROP TABLE foo_a;
    """))
