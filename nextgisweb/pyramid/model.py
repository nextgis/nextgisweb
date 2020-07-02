# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from .. import db
from ..models import declarative_base

Base = declarative_base()


class Session(Base):
    __tablename__ = 'session'

    id = db.Column(db.Unicode(32), primary_key=True)
    created = db.Column(db.DateTime, nullable=False)
    last_activity = db.Column(db.DateTime, nullable=False)


class SessionStore(Base):
    __tablename__ = 'session_store'

    session_id = db.Column(db.Unicode, db.ForeignKey(Session.id), primary_key=True)
    key = db.Column(db.Unicode(32), primary_key=False)
    value = db.Column(db.Unicode, nullable=False)

    session = db.relationship(
        Session, foreign_keys=session_id,
        backref=db.backref('store', cascade='all,delete-orphan'))
