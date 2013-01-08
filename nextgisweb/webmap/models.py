# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models.base import (
    Base,
    DBSession,
)


class WebMap(Base):
    __tablename__ = 'webmap'

    id = sa.Column(sa.Integer, primary_key=True)
    display_name = sa.Column(sa.Unicode, nullable=False)
    root_item_id = sa.Column(sa.Integer, sa.ForeignKey('webmap_item.id'), nullable=False)

    root_item = orm.relationship('WebMapItem', cascade='all')

    def __unicode__(self):
        return self.display_name

    def to_dict(self):
        return dict(
            id=self.id,
            display_name=self.display_name,
            root_item=self.root_item.to_dict(),
        )

    def from_dict(self, data):
        if 'display_name' in data:
            self.display_name = data['display_name']
        if 'root_item' in data:
            DBSession.delete(self.root_item)
            self.root_item = WebMapItem(item_type='root')
            self.root_item.from_dict(data['root_item'])


class WebMapItem(Base):
    __tablename__ = 'webmap_item'

    id = sa.Column(sa.Integer, primary_key=True)
    parent_id = sa.Column(sa.Integer, sa.ForeignKey('webmap_item.id'))
    item_type = sa.Column(sa.Enum('root', 'group', 'layer', native_enum=False), nullable=False)
    position = sa.Column(sa.Integer, nullable=True)
    display_name = sa.Column(sa.Unicode, nullable=True)
    group_expanded = sa.Column(sa.Boolean, nullable=True)
    layer_style_id = sa.Column(sa.Integer, sa.ForeignKey('style.id'), nullable=True)
    layer_enabled = sa.Column(sa.Boolean, nullable=True)

    parent = orm.relationship('WebMapItem',
        remote_side=[id],
        backref=orm.backref('children', cascade='all')
    )

    style = orm.relationship('Style')

    def to_dict(self):
        if self.item_type in ('root', 'group'):
            children = list(self.children)
            sorted(children, key=lambda c: c.position)

            if self.item_type == 'root':
                return dict(
                    item_type=self.item_type,
                    children=[i.to_dict() for i in children],
                )
            
            elif self.item_type == 'group':
                return dict(
                    item_type=self.item_type,
                    display_name=self.display_name,
                    group_expanded=self.group_expanded,
                    children=[i.to_dict() for i in children],
                )

        elif self.item_type == 'layer':
            return dict(
                item_type=self.item_type,
                display_name=self.display_name,
                layer_enabled=self.layer_enabled,
                layer_style_id=self.layer_style_id,
            )

    def from_dict(self, data):
        assert data['item_type'] == self.item_type
        if data['item_type'] in ('root', 'group') and 'children' in data:
            self.children = []
            pos = 1
            for i in data['children']:
                child = WebMapItem(parent=self, item_type=i['item_type'], position=pos)
                child.from_dict(i)
                self.children.append(child)
                pos += 1
        for a in ('display_name', 'group_expanded', 'layer_enabled', 'layer_style_id'):
            if a in data:
                setattr(self, a, data[a])


