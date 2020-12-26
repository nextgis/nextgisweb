Changes
=======

3.7.0
-----

- Add support of 1.1.0 version in WFS server implementation.
- Improved handling of NODATA values in raster layer and raster style.
- Fix infinite wait of database lock, including during vector layer deletion.

3.6.0
-----

- Major improvements and bug fixes in WFS protocol implementation.
- Permission model changes: now any action on resource requires ``read`` permission
  from scope ``resource`` on the resource and its parent.
- PostGIS layer extent calculation and improved extent calculation in vector layer.
- Vector layer export to GeoPackage format.
- Faster processing of empty tiles and images.
- Tile cache and webmap annotations are enabled by default.
- Command to delete orphaned vector layer tables.
- HTTP API with resource permissions explanation. 
- Support for ``like``, ``geom`` and ``extensions`` in feature layer REST API.
- Support for GeoJSON files in ZIP-archive and faster ZIP-archive unpacking.
- Clickable resource links in webmap, WMS and WFS services.
- Ability to disable SSL certificate check for TMS connection.
- Lookup table component is part of ``nextgisweb`` core package ``nextgisweb``.
- Fix TMS layer tile composition in case of extent outside the bounds.
- Fix GDAL > 3 compability issues, including axis orientation.
- SVG marker library resource available to renderers.

3.5.0
-----

- Raster layer export to GeoTIFF, ERDAS IMAGINE and Panorama RMF formats.
- Customizable link preview for resources.
- Improved resource picker: inappropriate resources are disabled now.
- New implementation of WFS server which fixes many bugs.
- Quad-key support in TMS connection and layer.
- Support for ``geom_format`` and ``srs`` in feature layer REST API (POST / PUT requests).
- Session based OAuth authentication with token refresh support.
- Delete users and groups via REST API.
- Track timestamps of user's last activity.
- Customization of webmap's identify popup via control panel.
- Speedup cleanup of file storage maintenance and cleanup.
- Fix bulk feature deletion API when passing an empty list.
- Fix bug in CORS implementation for requests returning errors.
- Fix coordinates display format in webmap's identification pop-up.
- Fix tile distortion issue for raster styles

3.4.2
-----

- Fix WMS layer creation.

3.4.1
-----

- Fix layout scroll bug in vector layer fields editing.

3.4.0
-----

- New `tus-based <https://tus.io>`_ file uploader. Check for size limits before starting an upload.
- Server-side TMS-client. New resource types: TMS connection and TMS layer.
- Create, delete and reorder fields for existing vector layer.
- Improved `Sentry <https://sentry.io>`_ integration.
- WMS service layer ordering.
- Stay on the same page after login.
- Error messages improvements on trying to: render non-existing layer, access
  non-existing attachment or write a geometry to a layer with a different geometry
  type.
