""" {
    "revision": "4ca9e701", "parents": ["4ca767a9"],
    "date": "2025-06-25T09:25:18",
    "message": "Populate meta column"
} """


from json import dumps

from msgspec import to_builtins
from osgeo import gdal
from sqlalchemy import text

from nextgisweb.env.model import DBSession

from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_layer.model import RasterBand, RasterLayerMeta


def forward(ctx):
    connection = DBSession.connection()
    for resource in DBSession.query(RasterLayer).all():
        ds = resource.gdal_dataset()

        bands = []
        for bidx in range(1, ds.RasterCount + 1):
            band = ds.GetRasterBand(bidx)
            minval, maxval = band.ComputeRasterMinMax(True)
            bands.append(
                RasterBand(
                    color_interp=gdal.GetColorInterpretationName(band.GetColorInterpretation()),
                    no_data=band.GetNoDataValue(),
                    rat=band.GetDefaultRAT() is not None,
                    min=minval,
                    max=maxval,
                )
            )
        meta = RasterLayerMeta(
            geo_transform=list(ds.GetGeoTransform()),
            bands=bands,
        )

        # fmt: off
        connection.execute(
            text("""
                UPDATE raster_layer
                SET meta = :meta
                WHERE id = :id
            """),
            {
                "meta": dumps(to_builtins(meta)),
                "id": resource.id
            }
        )
        # fmt: on


def rewind(ctx):
    pass
