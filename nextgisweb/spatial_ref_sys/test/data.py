def transform_batch_input(srs_ids):
    return {
        "geom": "LineString (3.14325808 48.40736379, 3.96493966 47.88959904, 4.85183405 47.98571393, 5.37353664 48.57591553, 5.99957974 48.83842479)",
        "srs_from": srs_ids["EPSG:4326"],
        "srs_to": [
            srs_ids["EPSG:3857"],
            srs_ids["EPSG:3395"],
            srs_ids["EPSG:32631"],
        ],
    }


def transform_batch_input_wrong_srs_to(srs_ids):
    return {
        "geom": "LineString (3.14325808 48.40736379, 3.96493966 47.88959904, 4.85183405 47.98571393, 5.37353664 48.57591553, 5.99957974 48.83842479)",
        "srs_from": srs_ids["EPSG:4326"],
        "srs_to": [-1],
    }


def transform_batch_expected(srs_ids):
    return [
        {
            "srs_id": srs_ids["EPSG:3857"],
            "geom": "LineString (349905.88928162 6174895.21624317, 441375.06365814 6088507.66266534, 540103.69631852 6104478.47088981, 598179.36258932 6203207.10355019, 667870.16211429 6247489.79908168)",
        },
        {
            "srs_id": srs_ids["EPSG:3395"],
            "geom": "LineString (349905.88889744 6142922.38960332, 441375.06397726 6056793.23117881, 540103.69585947 6072715.87714602, 598179.3625238 6171150.71953178, 667870.16163044 6215303.82979555)",
        },
        {
            "srs_id": srs_ids["EPSG:32631"],
            "geom": "LineString (510602.00673794 5361588.5429297, 572133.25982195 5304480.3659532, 638174.1527995 5316371.68645514, 675069.39175725 5383033.85462359, 720092.28432239 5413833.69654404)",
        },
    ]


srs_def = [
    {
        "display_name": "EPSG:3395",
        "wkt": 'PROJCS["WGS 84 / World Mercator", GEOGCS["WGS 84", DATUM["WGS_1984", SPHEROID["WGS 84",6378137,298.257223563, AUTHORITY["EPSG","7030"]], AUTHORITY["EPSG","6326"]], PRIMEM["Greenwich",0, AUTHORITY["EPSG","8901"]], UNIT["degree",0.0174532925199433, AUTHORITY["EPSG","9122"]], AUTHORITY["EPSG","4326"]], PROJECTION["Mercator_1SP"], PARAMETER["central_meridian",0], PARAMETER["scale_factor",1], PARAMETER["false_easting",0], PARAMETER["false_northing",0], UNIT["metre",1, AUTHORITY["EPSG","9001"]], AXIS["Easting",EAST], AXIS["Northing",NORTH], AUTHORITY["EPSG","3395"]]',
    },
    {
        "display_name": "EPSG:32631",
        "wkt": 'PROJCS["WGS 84 / UTM zone 31N", GEOGCS["WGS 84", DATUM["WGS_1984", SPHEROID["WGS 84",6378137,298.257223563, AUTHORITY["EPSG","7030"]], AUTHORITY["EPSG","6326"]], PRIMEM["Greenwich",0, AUTHORITY["EPSG","8901"]], UNIT["degree",0.0174532925199433, AUTHORITY["EPSG","9122"]], AUTHORITY["EPSG","4326"]], PROJECTION["Transverse_Mercator"], PARAMETER["latitude_of_origin",0], PARAMETER["central_meridian",3], PARAMETER["scale_factor",0.9996], PARAMETER["false_easting",500000], PARAMETER["false_northing",0], UNIT["metre",1, AUTHORITY["EPSG","9001"]], AXIS["Easting",EAST], AXIS["Northing",NORTH], AUTHORITY["EPSG","32631"]]',
    },
]
