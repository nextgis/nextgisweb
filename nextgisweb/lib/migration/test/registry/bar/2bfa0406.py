""" {
    "revision": "2bfa0406", "parents": ["2bfa0320"],
    "dependencies": ["foo==2bfa06fe"]
} """

from textwrap import dedent


def forward(ctx):
    ctx.execute(dedent("""
        ALTER TABLE bar RENAME TO bar_tmp;

        CREATE TABLE bar (
            id INTEGER PRIMARY KEY,
            foo_id INTEGER NOT NULL,
            FOREIGN KEY(foo_id) REFERENCES foo(id)
        );

        INSERT INTO bar SELECT * FROM bar_tmp;
        DROP TABLE bar_tmp;
    """))


def rewind(ctx):
    ctx.execute(dedent("""
        ALTER TABLE bar RENAME TO bar_tmp;

        CREATE TABLE bar (
            id INTEGER PRIMARY KEY,
            foo_id TEXT NOT NULL
        );

        INSERT INTO bar SELECT * FROM bar_tmp;
        DROP TABLE bar_tmp;
    """))
