""" {
    "revision": "35e3442d", "parents": ["00000000"],
    "date": "2022-05-15T00:28:44",
    "message": "Remove cookie secret"
} """
from pathlib import Path


def forward(ctx):
    fn = Path(ctx.env.core.gtsdir(ctx.env.pyramid)) / 'secret'
    fn.unlink(missing_ok=True)


def rewind(ctx):
    pass  # Nothing to do
