from unittest.mock import patch

import httpx2
import pytest
import transaction

from nextgisweb.core.exception import ExternalServiceError

from ..model import Connection
from ..tile_fetcher import TimeoutError as FetcherTimeoutError

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


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
def test_httpx_exception_mapped(exc_class, mapped_to):
    with transaction.manager:
        conn = Connection(
            url_template="http://invalid.test/{z}/{x}/{y}",
        ).persist()

    async def fail(*args, **kwargs):
        raise exc_class("simulated")

    with patch.object(httpx2.AsyncClient, "get", fail):
        with pytest.raises(mapped_to):
            list(conn.get_tiles("ngw", 0, 0, 0, 0, 0))
