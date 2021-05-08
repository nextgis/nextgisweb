# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import logging
from math import ceil, floor
from itertools import product
from datetime import datetime

from pyproj import Transformer
import transaction

from ..command import Command
from ..models import DBSession

from .model import ResourceTileCache
from .util import affine_bounds_to_tile


_logger = logging.getLogger(__name__)


SEED_STEP = 16
SEED_INTERVAL = 30

TILE_QUEUE_TIMEOUT = 60


@Command.registry.register
class TileCacheSeedCommand():
    identity = 'render.tile_cache_seed'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        tc_ids = DBSession.query(ResourceTileCache.resource_id).filter(
            ResourceTileCache.enabled,
            ResourceTileCache.seed_z != None  # NOQA: E711
        ).all()

        # TODO: Add arbitrary SRS support
        srs_tr = Transformer.from_crs(4326, 3857, always_xy=True)

        for tc_id in tc_ids:
            tc = ResourceTileCache.filter_by(resource_id=tc_id).one()

            rend_res = tc.resource
            data_res = rend_res.parent
            srs = data_res.srs

            # TODO: Add arbitrary SRS support
            extent_4326 = data_res.extent
            extent = srs_tr.transform(extent_4326['minLon'], extent_4326['minLat']) + \
                srs_tr.transform(extent_4326['maxLon'], extent_4326['maxLat'])

            rlevel = list()
            rcount = 0

            for z in range(1, tc.seed_z + 1):
                atf = affine_bounds_to_tile((srs.minx, srs.miny, srs.maxx, srs.maxy), z)

                t_lb = tuple(atf * extent[0:2])
                t_rt = tuple(atf * extent[2:4])

                tb = (
                    int(floor(t_lb[0]) if t_lb[0] == min(t_lb[0], t_rt[0]) else ceil(t_lb[0])),
                    int(floor(t_lb[1]) if t_lb[1] == min(t_lb[1], t_rt[1]) else ceil(t_lb[1])),
                    int(floor(t_rt[0]) if t_rt[0] == min(t_lb[0], t_rt[0]) else ceil(t_rt[0])),
                    int(floor(t_rt[1]) if t_rt[1] == min(t_lb[1], t_rt[1]) else ceil(t_rt[1])),
                )

                rx = (min(tb[0], tb[2]), max(tb[0], tb[2]))
                ry = (min(tb[1], tb[3]), max(tb[1], tb[3]))

                count = (rx[1] - rx[0]) * (ry[1] - ry[0])
                rcount += count
                rlevel.append((z, rx, ry, count))

            tc.update_seed_status('started')

            # Reload expired session objects
            transaction.commit()
            tc = ResourceTileCache.filter_by(resource_id=tc.resource_id).one()
            rend_res = tc.resource
            srs = rend_res.srs

            _logger.info("Seeding tile cache for resource %d with %d tiles", rend_res.id, rcount)

            progress = 0
            rendered = 0

            b_start = datetime.utcnow()

            for z, rx, ry, count in rlevel:
                # TODO: Add meta tile support
                for x, y in product(range(*rx), range(*ry)):
                    cache_exists, img = tc.get_tile((z, x, y))
                    if not cache_exists:
                        req = rend_res.render_request(srs)
                        rimg = req.render_tile((z, x, y), 256)
                        tc.put_tile((z, x, y), rimg, timeout=TILE_QUEUE_TIMEOUT)
                        rendered += 1

                    progress += 1

                    if (progress % SEED_STEP) == 0 and (
                        (datetime.utcnow() - b_start).total_seconds() > SEED_INTERVAL
                    ):
                        b_start = datetime.utcnow()
                        tc.update_seed_status('progress', progress=progress, total=rcount)

                        # Reload expired session objects
                        transaction.commit()
                        tc = ResourceTileCache.filter_by(resource_id=tc.resource_id).one()
                        rend_res = tc.resource
                        srs = rend_res.srs

                        _logger.debug(
                            "%d tiles processed and %d rendered for resource %d (%.2f)",
                            progress, rendered, rend_res.id, 100.0 * progress / rcount)

            tc.update_seed_status('completed', total=rcount)
            transaction.commit()

            _logger.info(
                "Completed seeding cache for resource %d (%d tiles processed, %d rendered)",
                rend_res.id, progress, rendered)
