import pytest
from zope.interface import implementer

from nextgisweb.env import gettext

from ..exception import IUserException, UserException, user_exception


def test_interface():
    @implementer(IUserException)
    class TestException(Exception):
        title = "Title"
        message = "Message"
        detail = "Detail"
        data = dict(key="value")
        http_status_code = 418

    exc = TestException()

    uexc = IUserException(exc)
    assert uexc.title == "Title"
    assert uexc.message == "Message"
    assert uexc.detail == "Detail"
    assert uexc.data == dict(key="value")
    assert uexc.http_status_code == 418


def test_adaptaion():
    class TestException(Exception):
        pass

    exc = TestException()
    user_exception(
        exc,
        title="Title",
        message="Message",
        detail="Detail",
        data=dict(key="value"),
        http_status_code=418,
    )

    uexc = IUserException(exc)
    assert uexc.title == "Title"
    assert uexc.message == "Message"
    assert uexc.detail == "Detail"
    assert uexc.data == dict(key="value")
    assert uexc.http_status_code == 418


def test_not_implemented():
    class TestException(Exception):
        pass

    with pytest.raises(TypeError):
        IUserException(TestException())


def test_user_exception():
    try:
        raise UserException(
            title="Title",
            message="Message",
            detail="Detail",
            data=dict(key="value"),
            http_status_code=418,
        )
    except UserException as exc:
        assert str(exc) == "UserException: Message"
        assert exc.title == "Title"
        assert exc.message == "Message"
        assert exc.detail == "Detail"
        assert exc.http_status_code == 418


def test_localizer():
    exc = UserException(gettext("The answer is %d") % 42)
    assert str(exc) == "UserException: The answer is 42"


def test_positional_message():
    exc = UserException("Message")
    assert exc.message == "Message"
    assert exc.title is None
