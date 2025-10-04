import sqlalchemy as sa

from nextgisweb.env import COMP_ID, Component, DBSession, gettext, require
from nextgisweb.lib.config import Option

from nextgisweb.auth import User

from .adapter import WebMapAdapter
from .model import LegendSymbolsEnum, WebMap, WebMapItem


class WebMapComponent(Component):
    def __init__(self, env, settings):
        from . import favorite  # noqa: F401

        super().__init__(env, settings)

    def initialize(self):
        super().initialize()

    @require("resource", "auth")
    def initialize_db(self):
        # Create a default web-map if there are none
        # TODO: option to turn this off through settings
        if WebMap.filter_by(parent_id=0).first() is None:
            dispname = self.env.core.localizer().translate(gettext("Main web map"))
            WebMap(
                parent_id=0,
                display_name=dispname,
                owner_user=User.filter_by(keyname="administrator").one(),
                root_item=WebMapItem(item_type="root"),
            ).persist()

    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        from nextgisweb.pyramid.api import csetting

        result = dict(
            {k: v.getter() for k, v in csetting.registry[COMP_ID].items()},
            editing=self.options["editing"],
            annotation=self.options["annotation"],
            adapters=dict(
                (i.identity, dict(display_name=request.localizer.translate(i.display_name)))
                for i in WebMapAdapter.registry.values()
            ),
            check_origin=self.options["check_origin"],
            nonimatim_url=self.options["nominatim.url"].rstrip("/"),
        )

        return result

    def query_stat(self):
        query_item_type = DBSession.query(
            WebMapItem.item_type, sa.func.count(WebMapItem.id)
        ).group_by(WebMapItem.item_type)
        return dict(item_type=dict(query_item_type.all()))

    def effective_legend_symbols(self):
        result = LegendSymbolsEnum.DISABLE + self.options["legend_symbols"]
        if s := self.env.core.settings_get("webmap", "legend_symbols", None):
            result += LegendSymbolsEnum(s)

        return result

    # fmt: off
    option_annotations = (
        Option("annotation", bool, default=True, doc="Turn on / off annotations."),
        Option("editing", bool, default=True),
        Option("check_origin", bool, default=False, doc="Check iframe Referer header."),
        Option("legend_symbols", LegendSymbolsEnum, default=LegendSymbolsEnum.COLLAPSE),
        Option("print.max_size", int, default=500, doc="Maximum paper size for printing web map in mm"),
        Option("nominatim.url", str, default="https://nominatim.openstreetmap.org"),
    )
    # fmt: on
