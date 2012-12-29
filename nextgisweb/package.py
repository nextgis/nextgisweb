# -*- coding: utf-8 -*-
import pkg_resources

def amd_packages():
    result = []
    for ep in pkg_resources.iter_entry_points(group='nextgisweb.amd_packages'):
        result.extend(ep.load()())
    return result