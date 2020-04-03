# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import requests


_sessions = dict()  # TODO: clear session objects


__all__ = ['get_session']


def get_session(key, scheme):
    if key in _sessions:
        return _sessions[key]

    session = requests.Session()
    adapter = requests.adapters.HTTPAdapter(
        pool_connections=500,
        pool_maxsize=500
    )
    session.mount(scheme + '://', adapter)

    _sessions[key] = session

    return session
