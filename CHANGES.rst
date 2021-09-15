Changes
=======

4.0.0
-----

- Source layer selection while creating vector layers from multi-layer sources, 
  such as ZIP-archives with ESRI Shape-files.
- Automatic generation of keynames for WMS and WFS services.
- Improved support for Unicode field names for WFS services.
- Setting for more granular control of resource export availability.
- Ability to log in as an arbitrary user with a session invitation.
- ISO-8601 date and time formatting in feature layer REST API via
  ``dt_format=iso`` option.
- Synchronization of translations with POEditor.


3.9.0
-----

- Simple tool for previewing resources on the map.
- Resource quick search tool in the page header.
- Disable/enable address search via settings in the control panel.
- Ability to constraint address search area by web map initial extent.
- Zoom to a better extent from address search and bookmark panel.
- Language autodetection, per-user language setting, and support for the
  external translation files.
- Automatic downsampling of a social preview image to 1600x630 pixels.
- Better support for KML: LIBKML GDAL driver is used when available.
- Filtering features by ID in feature REST API.
- Layers with an "id" field can be loaded if the field has an integer type.
- Information about available distribution versions in the control panel.
- Experimental storage accounting and estimation subsystem.

3.8.0
-----

- Ability to constraint a web map to the default extent.
- More length and area units in web map settings.
- Automatic correction of errors during the creation of a vector layer.
- Support for creation of vector layers from GML and KML files.
- User login is case insensitive when logging in.
- Configuration option for disabling social networks sharing buttons.
- Performance improvements in geometry handling and rendering, especially when
  converting between WKT and WKB formats.
- Performance improvements in tile cache component.
- Improved word wrapping in web map identification popup.
- Minimum and maximum scale restrictions in WMS server.
- Experimental integration of modern JavaScript and Webpack.
- Quota for the maximum number of enabled users.
- OpenLayers library upgraded to 6.5.0.
- OAuth server logout support via logout redirect endpoint.

3.7.0
-----

- Add database migrations framework and automatic migrations applying.
- External access links for styles, web maps (TMS), and feature layers (MVT).
- Experimental WFS client and raster mosaic, which is disabled by default.
- Add support of 1.1.0 version in WFS server implementation.
- Improved handling of NODATA values in raster layer and raster style.
- Compression level of PNG images is set to 3, which is much faster.
- Performance improvements and better concurrency for tile cache.
- New "CSV for Microsoft Excel" export format for better Excel compatibility.
- Fix infinite wait of database lock, including during vector layer deletion.
- Improved handling of invalid JSON bodies in RESP API, now the correct error
  message is returned.
- Vector layer export to MapInfo MIF/MID format.
- Vector layer export to Panorama SXF format.

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
- Session-based OAuth authentication with token refresh support.
- Delete users and groups via REST API.
- Track timestamps of user's last activity.
- Customization of web map identify popup via control panel.
- Speedup cleanup of file storage maintenance and cleanup.
- Fix bulk feature deletion API when passing an empty list.
- Fix bug in CORS implementation for requests returning errors.
- Fix coordinates display format in web map identification popup.
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
