from ..env.cli import cli, EnvCommand, arg

from .model import User
from .component import AuthComponent


@cli.command()
def change_password(
    self: EnvCommand.customize(use_transaction=True),
    keyname: str = arg(metavar="user"),
    password: str = arg(),
):
    """Change user's password"""

    user = User.filter_by(keyname=keyname).one()
    user.password = password


@cli.command()
def authenticate(
    self: EnvCommand.customize(use_transaction=True),
    keyname: str = arg(metavar="user|group"),
    base_url: str = arg(),
    *, auth: AuthComponent,
):
    """Impersonate an user via a link

    :param keyname: User or group keyname
    :param base_url: Base URL for a link"""

    url = auth.session_invite(keyname, base_url)
    print(url)
