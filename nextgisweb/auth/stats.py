from nextgisweb.core.stats import stats_hook

from .component import AuthComponent, _ucnt, _ula
from .model import User


@stats_hook()
def stats(comp: AuthComponent) -> dict:
    return dict(
        user_count=_ucnt(),
        local_count=_ucnt(User.password_hash.is_not(None)),
        oauth_count=_ucnt(User.oauth_subject.is_not(None)),
        last_activity=dict(
            everyone=_ula(),
            authenticated=_ula(User.keyname != "guest"),
            administrator=_ula(User.member_of.any(keyname="administrators")),
        ),
    )
