# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..style import Style


@Style.registry.register
class MapserverStyle(Style):
    __tablename__ = 'mapserver_style'

    identity = __tablename__
    cls_display_name = u"Mapserver"

    style_id = sa.Column(sa.Integer, sa.ForeignKey('style.id'), primary_key=True)
    opacity = sa.Column(sa.Integer, nullable=False, default=100)
    stroke_color = sa.Column(sa.Unicode, nullable=False)
    stroke_width = sa.Column(sa.Integer, nullable=False, default=1)
    fill_color = sa.Column(sa.Unicode, nullable=False)

    __mapper_args__ = dict(
        polymorphic_identity=identity,
    )

    @classmethod
    def is_layer_supported(cls, layer):
        return layer.cls == 'vector_layer'

    def render_image(self, extent, img_size, settings):
        mapfile = self._mapfile(settings)
        import mapscript

        mapobj = mapscript.fromstring(mapfile)

        req = mapscript.OWSRequest()
        req.setParameter("bbox", ','.join([str(i) for i in extent]))
        req.setParameter("width", str(img_size[0]))
        req.setParameter("height", str(img_size[1]))
        req.setParameter("srs", 'epsg:3857')
        req.setParameter("format", 'image/png')
        req.setParameter("layers", 'main')
        req.setParameter("request", "GetMap")
        req.setParameter('transparent', 'TRUE')

        mapobj.loadOWSParameters(req)

        img = mapobj.draw()
        return img

    def _mapfile(self, settings):
        template = """
            MAP
                SIZE 800 600
                MAXSIZE 4096

                IMAGECOLOR 255 255 255
                IMAGETYPE PNG

                OUTPUTFORMAT
                    NAME "png"
                    EXTENSION "png"
                    MIMETYPE "image/png"
                    DRIVER AGG/PNG
                    IMAGEMODE RGBA
                    FORMATOPTION "INTERLACE=OFF"
                END

                WEB
                    METADATA
                        wms_onlineresource "http://localhost/"
                        wfs_onlineresource "http://localhost/"
                        ows_title "nextgisweb"
                        wms_enable_request "*"
                        wms_srs "EPSG:3857"
                    END
                END

                EXTENT -180 -90 180 90
                PROJECTION
                    "init=epsg:4326"
                END

                LAYER
                    NAME "main"
                    CONNECTION "%(connection)s"
                    CONNECTIONTYPE postgis
                    PROCESSING "CLOSE_CONNECTION=DEFER"
                    PROCESSING "APPROXIMATION_SCALE=FULL"
                    DATA "geom from (select fid, ST_Transform(ST_SetSRID(geom, 4326), 3857) as geom from %(table)s) as sub using unique fid using srid=3857"
                    TYPE %(type)s
                    DUMP TRUE
                    TEMPLATE dummy.html
                    PROJECTION
                        "init=epsg:3857"
                    END
                    EXTENT -20037508.34 -20037508.34 20037508.34 20037508.34

                    %(mapfile_class)s

                END
            END
        """

        connection = [
            'user=%s' % settings['database.user'],
            'host=%s' % settings['database.host'],
            'dbname=%s' % settings['database.name'],
        ]

        if 'database.password' in settings:
            connection.append('password=%s' % settings['database.password'])

        return template % dict(
            connection=' '.join(connection),
            type={"Point": 'point', 'Linestring': 'line', 'Polygon': 'polygon'}[self.layer.geom_type],
            table='vector_layer.id%04d' % self.layer.id,
            mapfile_class=self._mapfile_class(),
        )

    def _mapfile_class(self):
        result = ''

        if self.opacity:
            result += "OPACITY %d\n" % self.opacity

        result += "CLASS\n\tSTYLE\n"

        if self.fill_color != '':
            result += "\t\tCOLOR %s\n" % self.fill_color

        if self.stroke_color != '':
            result += "\t\tOUTLINECOLOR %s\n" % self.stroke_color

        if self.stroke_width != '':
            result += "\t\tWIDTH %d\n" % self.stroke_width

        result += "\tEND\nEND\n"

        return result
