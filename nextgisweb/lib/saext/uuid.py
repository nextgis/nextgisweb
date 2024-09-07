import sqlalchemy.dialects.postgresql as sa_postgresql


class UUID(sa_postgresql.UUID):
    """SQLAclhemy-s PostgreSQL UUID wrapper with as_uuid=True by default"""

    def __init__(self, *args, **kwargs):
        if "as_uuid" not in kwargs:
            kwargs["as_uuid"] = True
        super().__init__(*args, **kwargs)
