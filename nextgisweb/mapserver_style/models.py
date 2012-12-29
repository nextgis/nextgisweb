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
    stroke_width = sa.Column(sa.Integer, nullable=False, default=1)
    stroke_color = sa.Column(sa.Unicode, nullable=False)
    fill_color = sa.Column(sa.Unicode, nullable=False)

    __mapper_args__ = dict(
        polymorphic_identity=identity,
    )

    widget_module = 'mapserver_style/Widget'

    def to_dict(self):
        result = Style.to_dict(self)
        result['mapserver_style'] = dict(
            opacity=self.opacity,
            stroke_color=self.stroke_color,
            stroke_width=self.stroke_width,
            fill_color=self.fill_color,
        )

        return result

    def from_dict(self, data):
        Style.from_dict(self, data)

        if 'mapserver_style' in data:
            mapserver_style = data['mapserver_style']

            for k in ('opacity', 'stroke_color', 'stroke_width', 'fill_color'):
                if k in mapserver_style:
                    setattr(self, k, mapserver_style[k])

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

        def color_h2d(h):
            return ("%d %d %d" % (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)))

        if self.opacity:
            result += "OPACITY %d\n" % self.opacity

        result += "CLASS\n\tSTYLE\n"

        if self.fill_color != '':
            result += "\t\tCOLOR %s\n" % color_h2d(self.fill_color)

        if self.stroke_color != '':
            result += "\t\tOUTLINECOLOR %s\n" % color_h2d(self.stroke_color)

        if self.stroke_width != '':
            result += "\t\tWIDTH %d\n" % self.stroke_width

        result += "\tEND\nEND\n"

        return result

    @classmethod
    def widget_config(cls, layer):
        result = Style.widget_config(layer)
        return result
