# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import zope.interface

from nextgisweb.error import IErrorInfo, provide_error_info


def test_interface():
    class TestException(Exception):
        zope.interface.implements(IErrorInfo)

        http_status_code = 418
        data = dict()

        @property
        def message(self):
            return unicode(self)

    exc = TestException("Test message")
    einfo = IErrorInfo(exc)

    assert einfo.message == "Test message"
    assert einfo.http_status_code == 418
    assert einfo.data == dict()


def test_adaptaion():
    class TestException(Exception):
        pass

    einfo = IErrorInfo(provide_error_info(
        TestException(),
        message="Test message",
        http_status_code=418,
        data=dict()))

    assert einfo.message == "Test message"
    assert einfo.http_status_code == 418
    assert einfo.data == dict()


def test_not_implemented():
    class TestException(Exception):
        pass

    with pytest.raises(TypeError):
        IErrorInfo(TestException())