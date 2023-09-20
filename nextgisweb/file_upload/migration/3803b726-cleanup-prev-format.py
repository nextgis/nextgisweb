""" {
    "revision": "3803b726", "parents": ["00000000"],
    "date": "2022-08-29T05:23:39",
    "message": "Cleanup prev format"
} """


import os
import re
from pathlib import Path
from shutil import rmtree

pattern = re.compile(r"^[0-9a-f]{2}$")


def forward(ctx):
    path = Path(ctx.env.file_upload.path)

    for level1 in path.iterdir():
        if not (level1.is_dir() and pattern.match(level1.name)):
            continue

        for level2 in level1.iterdir():
            if not (level2.is_dir() and pattern.match(level2.name)):
                continue
            rmtree(level2)

        if len(os.listdir(level1)) == 0:
            level1.rmdir()


def rewind(ctx):
    pass
