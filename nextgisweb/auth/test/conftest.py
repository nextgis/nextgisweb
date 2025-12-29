import pytest
import sqlalchemy as sa
import transaction

from ..model import User


@pytest.fixture()
def disable_users():
    active_uids = []

    with transaction.manager:
        for user in User.filter(
            sa.and_(
                User.keyname != "administrator",
                sa.not_(User.disabled),
                sa.not_(User.system),
            )
        ).all():
            user.disabled = True
            active_uids.append(user.id)

    yield

    with transaction.manager:
        for user in User.filter(User.id.in_(active_uids)).all():
            user.disabled = False
