""" {
    "revision": "2bfa06fe", "parents": ["2bfa061e"]
} """

from textwrap import dedent


def forward(ctx):
    # fmt: off
    ctx.execute(dedent("""
        ALTER TABLE foo RENAME TO foo_tmp;

        CREATE TABLE foo (
            id INTEGER PRIMARY KEY,
            value TEXT
        );

        INSERT INTO foo SELECT * FROM foo_tmp;
        DROP TABLE foo_tmp;
    """))
    # fmt: on


def rewind(ctx):
    # fmt: off
    ctx.execute(dedent("""
        ALTER TABLE foo RENAME TO foo_tmp;

        CREATE TABLE foo (
            id TEXT PRIMARY KEY,
            value TEXT
        );

        INSERT INTO foo SELECT * FROM foo_tmp;
        DROP TABLE foo_tmp;
    """))
    # fmt: on
