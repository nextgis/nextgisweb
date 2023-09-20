""" {
    "revision": "2bfa0530", "parents": ["00000000"],
    "message": "Create table foo_a"
} """


def forward(ctx):
    ctx.execute("CREATE TABLE foo_a (id INTEGER PRIMARY KEY);")


def rewind(ctx):
    ctx.execute("DROP TABLE foo_a;")
