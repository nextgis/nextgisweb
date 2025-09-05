import asyncio
import atexit
from dataclasses import dataclass
from queue import Empty, Queue
from ssl import SSLCertVerificationError
from threading import Thread
from typing import Optional, Tuple

from httpx import AsyncClient, Limits, RemoteProtocolError, Timeout, TimeoutException

from nextgisweb.env import env, gettext

from nextgisweb.core.exception import ExternalServiceError

from .util import SCHEME, quad_key, toggle_tms_xyz_y

SHUTDOWN_TIMEOUT = 1


class FetchStatus:
    DONE = "done"
    DATA = "data"
    ERROR = "error"


@dataclass
class FetchResult:
    status: FetchStatus

    data: Optional[bytes] = None
    position: Optional[Tuple[int, int]] = None

    exception: Optional[Exception] = None


class TimeoutError(ExternalServiceError):
    message = gettext("The remote server did not respond in time.")


class TileFetcher:
    __instance = None

    def __init__(self):
        if TileFetcher.__instance is None:
            self._request_timeout = env.tmsclient.options["timeout"].total_seconds()
            self._session_timeout = self._request_timeout * 2

            self._queue = Queue(maxsize=1)
            self._loop = asyncio.new_event_loop()

            self._worker = Thread(target=self._job, daemon=True)
            self._worker.start()

    @classmethod
    def instance(cls):
        if cls.__instance is None:
            cls.__instance = TileFetcher()
        return cls.__instance

    async def _get_tiles(
        self,
        tasks,
        client,
        *,
        req_kw,
        scheme,
        url_template,
        zoom,
        xmin,
        xmax,
        ymin,
        ymax,
    ):
        async def _get_tile(position, xtile, ytile):
            if scheme == SCHEME.TMS:
                ytile = toggle_tms_xyz_y(zoom, ytile)

            url = url_template.format(x=xtile, y=ytile, z=zoom, q=quad_key(xtile, ytile, zoom))

            try:
                response = await client.get(url, **req_kw)
            except (RemoteProtocolError, SSLCertVerificationError) as exc:
                raise ExternalServiceError(
                    gettext("Unable to get a response from the remote server."),
                ) from exc
            except TimeoutException as exc:
                raise TimeoutError from exc
            if response.status_code == 200:
                data = response.content
            elif response.status_code in (204, 404):
                data = None
            else:
                raise ExternalServiceError(
                    gettext("An unexpected HTTP status code was received from the remote server."),
                    data=dict(status_code=response.status_code),
                )

            return position, data

        for x, xtile in enumerate(range(xmin, xmax + 1)):
            for y, ytile in enumerate(range(ymin, ymax + 1)):
                coro = _get_tile((x, y), xtile, ytile)
                tasks.append(asyncio.create_task(coro))

        for coro in asyncio.as_completed(tasks):
            yield await coro

    async def _ajob(self):
        self._shutdown = False
        atexit.register(self._wait_for_shutdown)

        params = dict(
            headers=env.tmsclient.headers,
            limits=Limits(max_keepalive_connections=8),
            http2=True,
        )
        async with (
            AsyncClient(**params) as client,
            AsyncClient(verify=False, **params) as client_insecure,
        ):
            while True:
                if self._shutdown:
                    break

                try:
                    get_timeout = SHUTDOWN_TIMEOUT / 5
                    data = self._queue.get(True, get_timeout)
                except Empty:
                    continue

                answer = data.pop("answer")
                _client = client_insecure if data.pop("insecure") else client
                tasks = []
                try:
                    async for pos, data in self._get_tiles(tasks, _client, **data):
                        answer.put_nowait(FetchResult(FetchStatus.DATA, position=pos, data=data))
                except Exception as exc:
                    answer.put_nowait(FetchResult(FetchStatus.ERROR, exception=exc))
                    for task in tasks:
                        task.cancel()
                else:
                    answer.put_nowait(FetchResult(FetchStatus.DONE))

    def _job(self):
        self._loop.run_until_complete(self._ajob())

    def get_tiles(self, connection, layer_name, zoom, xmin, xmax, ymin, ymax):
        url_template = connection.url_template
        if r"{layer}" in url_template:
            url_template = url_template.replace(r"{layer}", layer_name)
        data = dict(
            scheme=connection.scheme,
            url_template=url_template,
            zoom=zoom,
            xmin=xmin,
            xmax=xmax,
            ymin=ymin,
            ymax=ymax,
        )
        data["req_kw"] = dict(
            params=connection.query_params,
            timeout=Timeout(timeout=self._request_timeout),
        )
        if connection.username is not None:
            data["req_kw"]["auth"] = (connection.username, connection.password)
        data["insecure"] = connection.insecure
        answer = data["answer"] = Queue()

        self._queue.put_nowait(data)

        while True:
            try:
                result = answer.get(True, self._session_timeout)
            except Empty:
                with self._queue.mutex:
                    self._queue.queue.clear()
                raise TimeoutError

            if result.status == FetchStatus.DONE:
                break
            if result.status == FetchStatus.ERROR:
                raise result.exception
            yield result.position, result.data

    def _wait_for_shutdown(self):
        self._shutdown = True
        self._worker.join(SHUTDOWN_TIMEOUT)
        self._loop.close()
