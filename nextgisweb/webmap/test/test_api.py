from __future__ import absolute_import
import pytest
import transaction

from nextgisweb.models import DBSession
from nextgisweb.auth import User

from nextgisweb.webmap.model import WebMap, WebMapItem

ANNOTATION_SAMPLE = dict(
    description='1', geom='POINT (0 0)',
    style=dict(string='string', int=0, bool=True, none=None)
)


@pytest.fixture(scope='module')
def webmap(env):
    with transaction.manager:
        obj = WebMap(
            parent_id=0, display_name=__name__,
            owner_user=User.by_keyname('administrator'),
            root_item=WebMapItem(item_type='root')
        ).persist()
        DBSession.flush()
        DBSession.expunge(obj)

    yield obj

    with transaction.manager:
        DBSession.delete(WebMap.filter_by(id=obj.id).one())


@pytest.fixture(scope='module')
def enable_annotation(env):
    remember = env.webmap.settings['annotation']
    env.webmap.settings['annotation'] = True
    yield None
    env.webmap.settings['annotation'] = remember


def test_annotation_post_get(webapp, webmap, enable_annotation):
    webapp.authorization = ('Basic', ('administrator', 'admin'))  # FIXME:
    wmid = webmap.id
    result = webapp.post_json('/api/resource/%d/annotation/' % wmid, ANNOTATION_SAMPLE)
    aid = result.json['id']

    assert aid > 0

    adata = webapp.get('/api/resource/%d/annotation/%d' % (wmid, aid)).json
    del adata['id']

    assert adata == ANNOTATION_SAMPLE
