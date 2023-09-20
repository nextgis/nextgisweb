""" {
    "revision": "2bfa05b4", "parents": ["00000000"],
    "message": "Create table foo_b"
} """


def forward(ctx):
    ctx.execute("CREATE TABLE foo_b (id INTEGER PRIMARY KEY);")


def rewind(ctx):
    ctx.execute("DROP TABLE foo_b;")
