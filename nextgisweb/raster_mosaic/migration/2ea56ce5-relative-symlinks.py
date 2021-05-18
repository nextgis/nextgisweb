# -*- coding: utf-8 -*-
""" {
    "revision": "2ea56ce5", "parents": ["00000000"],
    "date": "2021-05-18T09:27:43",
    "message": "relative-symlinks"
} """

from __future__ import division, unicode_literals, print_function, absolute_import

import os


def forward(ctx):
    core = ctx.env.core
    comp = ctx.env.raster_mosaic

    comp_dir = core.gtsdir(comp)
    for root, dirs, files in os.walk(comp_dir):
        for f in files:
            fpath = os.path.join(root, f)
            if os.path.islink(fpath):
                dst = os.readlink(fpath)
                dst_new = os.path.relpath(dst, root)
                os.unlink(fpath)
                os.symlink(dst_new, fpath)


def rewind(ctx):
    core = ctx.env.core
    comp = ctx.env.raster_mosaic

    comp_dir = core.gtsdir(comp)
    for root, dirs, files in os.walk(comp_dir):
        for f in files:
            fpath = os.path.join(root, f)
            if os.path.islink(fpath):
                dst = os.readlink(fpath)
                dst_new = os.path.normpath(os.path.join(root, dst))
                os.unlink(fpath)
                os.symlink(dst_new, fpath)
