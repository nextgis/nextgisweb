from unittest.mock import MagicMock, patch

import httpx2
import pytest
import transaction

from nextgisweb.core.exception import ExternalServiceError

from ..model import TMSConnection
from ..tile_fetcher import TimeoutError as FetcherTimeoutError

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture
def connection():
    with transaction.manager:
        conn = TMSConnection(
            url_template="http://invalid.test/{z}/{x}/{y}",
        ).persist()
    return conn.id


@pytest.mark.parametrize(
    "exc_class, mapped_to",
    [
        (httpx2.ReadError, ExternalServiceError),
        (httpx2.WriteError, ExternalServiceError),
        (httpx2.RemoteProtocolError, ExternalServiceError),
        (httpx2.ConnectError, ExternalServiceError),
        (httpx2.ReadTimeout, FetcherTimeoutError),
    ],
)
def test_httpx_exception_mapped(exc_class, mapped_to, connection):
    async def fail(*args, **kwargs):
        raise exc_class("simulated")

    with patch.object(httpx2.AsyncClient, "get", fail):
        with pytest.raises(mapped_to) as exc_info:
            list(TMSConnection.filter_by(id=connection).one().get_tiles("ngw", 0, 0, 0, 0, 0))

    if mapped_to is ExternalServiceError:
        assert exc_info.value.detail == f"{exc_class.__name__}."
        assert "simulated" not in str(exc_info.value)


def test_unexpected_status_code(connection):
    response = MagicMock(status_code=500)

    async def fake_get(*args, **kwargs):
        return response

    with patch.object(httpx2.AsyncClient, "get", fake_get):
        with pytest.raises(ExternalServiceError) as exc_info:
            list(TMSConnection.filter_by(id=connection).one().get_tiles("ngw", 0, 0, 0, 0, 0))

    assert "(500)" in str(exc_info.value.message)
    assert exc_info.value.data == dict(status_code=500)
