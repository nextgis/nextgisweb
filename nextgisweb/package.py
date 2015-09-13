# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import pkg_resources


def amd_packages():
    result = []
    for ep in pkg_resources.iter_entry_points(group='nextgisweb.amd_packages'):
        result.extend(ep.load()())
    return result
