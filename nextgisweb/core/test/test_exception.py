import pytest

from nextgisweb.env import gettext

from ..exception import UserException


def test_user_exception():
    with pytest.raises(UserException) as excinfo:
        raise UserException(
            title="Title",
            message="Message",
            detail="Detail",
            data=dict(key="value"),
            http_status_code=418,
        )

    exc = excinfo.value
    assert str(exc) == "Message"
    assert exc.title == "Title"
    assert exc.message == "Message"
    assert exc.detail == "Detail"
    assert exc.data == dict(key="value")
    assert exc.http_status_code == 418


def test_localizer():
    exc = UserException(gettext("The answer is %d") % 42)
    assert str(exc) == "The answer is 42"


def test_positional_message():
    exc = UserException("Message")
    assert exc.message == "Message"
    assert exc.title is None
