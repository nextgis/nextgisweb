from nextgisweb.env.cli import InTransactionCommand, arg, cli

from .component import AuthComponent
from .model import User


@cli.command()
def change_password(
    self: InTransactionCommand,
    keyname: str = arg(metavar="user"),
    password: str = arg(),
):
    """Change user's password"""

    user = User.filter_by(keyname=keyname).one()
    user.password = password


@cli.command()
def authenticate(
    self: InTransactionCommand,
    keyname: str = arg(metavar="user|group"),
    base_url: str = arg(),
    *,
    auth: AuthComponent,
):
    """Impersonate an user via a link

    :param keyname: User or group keyname
    :param base_url: Base URL for a link"""

    url = auth.session_invite(keyname, base_url)
    print(url)
