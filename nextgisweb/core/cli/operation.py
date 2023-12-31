import os
import shutil
from datetime import datetime, timedelta
from time import sleep
from typing import List

import transaction

from nextgisweb.env import DBSession
from nextgisweb.env.cli import EnvCommand, UninitializedEnvCommand, arg, cli, opt
from nextgisweb.lib.logging import logger

from ..backup import pg_connection_options
from ..component import CoreComponent


@cli.command()
def wait_for_service(self: EnvCommand, timeout: int = opt(120, short="t", metavar="SEC")):
    """Wait for required services and exit

    :param timeout: Seconds to wait or fail"""

    components = [
        (comp, comp.is_service_ready())
        for comp in self.env.components.values()
        if hasattr(comp, "is_service_ready")
    ]

    messages = dict()

    def log_messages(logfunc):
        for comp, it in components:
            if messages[comp] is not None:
                logfunc("Message from [%s]: %s", comp.identity, messages[comp])

    start = datetime.now()
    deadline = start + timedelta(seconds=timeout)
    backoff = 1 / 8
    maxinterval = 10
    while len(components) > 0:
        nxt = []
        for comp, is_service_ready in components:
            try:
                messages[comp] = next(is_service_ready)
                nxt.append((comp, is_service_ready))
            except StopIteration:
                logger.debug(
                    "Service ready for component [%s] in %0.2f seconds",
                    comp.identity,
                    (datetime.now() - start).total_seconds(),
                )

        components = nxt
        if datetime.now() > deadline:
            log_messages(logger.error)
            logger.critical(
                "Wait for service failed in components: {}!".format(
                    ", ".join([comp.identity for comp, it in components])
                )
            )
            exit(1)

        elif len(components) > 0:
            if backoff == maxinterval:
                log_messages(logger.info)
                logger.info(
                    "Waiting {} seconds to retry in components: {}".format(
                        backoff, ", ".join([comp.identity for comp, it in components])
                    )
                )
            sleep(backoff)
            backoff = min(2 * backoff, maxinterval)


@cli.command()
def psql(
    self: UninitializedEnvCommand,
    arg: List[str] = arg(nargs="..."),
):
    """Launch psql connected to database

    The psql executable must be installed and available in shell search path
    (PATH environment variable).

    :param arg: Options and arguments passed to psql, use "--" prefix to separate"""

    opts, password = pg_connection_options(self.env)
    psql_path = shutil.which("psql")
    if psql_path is None:
        raise RuntimeError("Executable 'psql' not found!")
    environ = os.environ.copy()
    if password is not None:
        environ["PGPASSWORD"] = password

    psql_arg = list(arg)
    if len(psql_arg) > 0 and psql_arg[0] == "--":
        psql_arg.pop(0)

    os.execve(
        psql_path,
        [
            "psql",
        ]
        + opts
        + psql_arg,
        environ,
    )


@cli.command()
def maintenance(
    self: EnvCommand,
    estimate_storage: bool = opt(False),
    one_shot: bool = opt(False),
    *,
    core: CoreComponent,
):
    """Perform housekeeping tasks

    :param estimate_storage: Execute storage estimation after maintenance
    :param one_shot: Don't record metadata about this maintenance"""

    for comp in self.env.chain("maintenance"):
        logger.debug("Maintenance for component: %s...", comp.identity)
        comp.maintenance()

    if not one_shot:
        with transaction.manager:
            core.settings_set(
                core.identity,
                "last_maintenance",
                datetime.utcnow().isoformat(),
            )

    if estimate_storage:
        core.estimate_storage_all()


@cli.command()
def check_integrity(self: EnvCommand):
    """Check data integrity"""

    fail = False
    with DBSession.connection(
        execution_options=dict(
            isolation_level="SERIALIZABLE",
            postgresql_readonly=True,
            postgresql_deferrable=True,
        )
    ) as con:
        for comp in self.env.chain("check_integrity"):
            with con.begin_nested():
                try:
                    citer = comp.check_integrity()
                    if citer is not None and hasattr(citer, "__next__"):
                        for error in citer:
                            logger.error(f"Fault for [{comp.identity}]: {error}")
                            fail = True
                except Exception as exc:
                    logger.error(f"Error for [{comp.identity}]: {str(exc)}")
                    fail = True
    if fail:
        exit(1)
