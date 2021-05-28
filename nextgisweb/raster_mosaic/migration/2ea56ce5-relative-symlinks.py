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
    file_storage = ctx.env.file_storage
    comp = ctx.env.raster_mosaic

    file_storage_dir = core.gtsdir(file_storage)
    comp_dir = core.gtsdir(comp)
    for root, dirs, files in os.walk(comp_dir):
        for f in files:
            fpath = os.path.join(root, f)
            if os.path.islink(fpath):
                fname = os.path.basename(fpath)
                level0_dir, level1 = os.path.split(root)
                level0 = os.path.basename(level0_dir)

                file_storage_dir_relative = os.path.relpath(file_storage_dir, root)

                dst_new = os.path.join(file_storage_dir_relative, comp.identity,
                                       level0, level1, fname)
                os.unlink(fpath)
                os.symlink(dst_new, fpath)


def rewind(ctx):
    core = ctx.env.core
    file_storage = ctx.env.file_storage
    comp = ctx.env.raster_mosaic

    file_storage_dir = core.gtsdir(file_storage)
    comp_dir = core.gtsdir(comp)
    for root, dirs, files in os.walk(comp_dir):
        for f in files:
            fpath = os.path.join(root, f)
            if os.path.islink(fpath):
                fname = os.path.basename(fpath)
                level0_dir, level1 = os.path.split(root)
                level0 = os.path.basename(level0_dir)

                dst_new = os.path.join(file_storage_dir, comp.identity,
                                       level0, level1, fname)
                os.unlink(fpath)
                os.symlink(dst_new, fpath)
