Changes
=======

4.7.0
-----

- Update minimum required NodeJS version to 20.0.
- Add export to CSV and import from CSV for lookup tables.
- Enhanced feature attachment viewer now includes panoramic images support.
- Ability to copy printing parameters as a URL for sharing.
- Support for multiple replicas and long-runnning requests.
- Ctrl+Click opens feature attachment in a fixed tab.
- Configurable permissions for groups, users, SRS and CORS management.
- Lots of customization options for embedded webmaps: map tools and panels.
- Support for custom SVG logos in addition to PNG.
- Ability to exclude feature layer fields from text search.
- Directly toggle legend symbols for a better experience on webmaps.


4.6.0
-----

- Support for lookup tables for feature layer attributes.
- Print to TIFF format in addition to PDF, JPEG and PNG.
- Geometry-based filtering of feature tables on webmaps.
- Autodetection of minimum and maximum scales for webmap and WMS layers.
- Refresh feature tables after saving layer changes on webmaps.
- Improved handling of ``id`` and ``fid`` attributes of vector layers.
- Improved handling of date and time inputs.
- Passing a zoom level to webmaps via ``zoom`` attribute.
- Support for OpenID Connect UserInfo endpoint.


4.5.0
-----

- New tileset resource for storing and serving prerendered tiles.
- New OGC API Feature service with read and write support.
- Up to 2x speed-up of loading vector layer data.
- Differentiate webmap intial and contstraining extents.
- Support for Google Analytics metrics.
- Support for basic user-defined styles.
- Save to PDF from the webmap printing panel.
- Check effective permissions of other users for a resource.
- Legends for webmaps is enabled by default.
- Lots of improvements in feature editing widgets.
- OutputFormat declaration in WFS for better compatibility.
- Store audit journal in PostgreSQL database instead of ElasticSearch.
- React library upgraded to 18.
- Ant Design library upgraded to 5.


4.4.0
-----

- Auto-generated and configurable legends for webmaps.
- Reordering layers via drag-and-drop while viewing webmaps.
- Changing layer opacity while viewing webmaps.
- Creation of an empty vector layer without uploading a file.
- Ability to replace existing vector layer features and fields from a file.
- Brand-new feature table based on React.
- Resource and feature description editors updated to CKEditor 5.
- Improved handling of resource descriptions on webmaps.
- Zoom to a filtered set of features on webmaps.
- Geometry properties in the identification popup.
- Show the cursor location and the current extent on webmaps.
- Zoom to all layers on webmaps.
- Support for linear and polygonal annotations.
- Default display names for resources during creation.
- Deletion of all features and changing geometry type for vector layers.
- Limit by extent while exporting feature layers.
- Ability to export a filtered set of features.
- MapInfo formats support when creating a vector layer.
- TMS client: parallel fetching of tiles and HTTP/2.
- Reasonable resource tabs ordering and auto-activation.
- Improved usability of the layers tree on webmaps.
- Fast PNG compression for rendering.
- Chrome 102+, Safari 15+, Edge 109+ or Firefox 102+ is required.
- User permissions section is moved to a separate page.
- OAuth-based automatic group assignment.


4.3.2
-----

- Fix feature attachment download issues.


4.3.1
-----

- Fix resource group selection issue while cloning webmaps.


4.3.0
----------

- Support for webmap cloning via UI.
- Search by coordinates on web maps.
- CSV and XLSX support when creating a vector layer.
- Export and import feature layer attachments.
- Vector layer export to KML and KMZ formats.
- Fields selection while exporting feature layer.
- Assign default groups while creating users via UI.
- Experimental support for authorization links.
- Use resource SRS by default while exporting raster and vector layers.
- Support for booleans and nulls in resource metadata.
- Support for fixed length ``character`` columns in PostGIS layers.
- Support for materialized views and 25D geometries in PostGIS layers.
- Ability to turn off user password and keep only OAuth authentication.
- Check for disk free space in the healthcheck.
- Ability to search through resources recursively in REST API.
- OpenLayers library upgraded to 6.15.1.


4.2.0
-----

- "Locate me" tool on web maps.
- Identifiable setting for web map layers.
- Batch deletion and moving of resources.
- Ability to download raster layers as an internal representation.
- PostGIS connection and layer diagnostic tool.
- Support for quad-key basemaps on web maps.
- OAuth improvements: NextGIS ID integration, simultaneous authorization code
  and password grant types.
- Improved management of spatial reference systems and catalog integration.
- Better support for 25D geometries on web maps and PostGIS layers.
- Improved handling of URLs in descriptions and feature layer fields.
- Cloud-optimized GeoTIFF (COG) enabled by default.
- In-place conversion between COG and non-COG rasters.
- Hide empty groups and groups with no accessible layers on web maps.
- M dimension stripping while creating vector layers in LOSSY mode.
- Selecting features on web maps via ``hl_*`` URL parameters.
- Ability to inject some HTML into the base template for metrics and counters.
- Fast JSON serialization and deserialization based on orjson library.
- Completed control panel migration to Antd and React.


4.1.0
-----

- Cloud-optimized GeoTIFF (COG) support for raster layers.
- Browser compatibility test and Internet Explorer deprecation.
- Experimental support for long-runnning requests for raster and vector layers
  creation using ``lunkwill`` extension.
- Private annotations on web maps, visible only for authors.
- Wrapping around the dateline for tile-based layers on web maps.
- A lot of improvements for the control panel: filters, batch operations, etc.
- Improved handling of vector layer sources with ``id`` and ``geom`` fields.
- Reprojection into different coordinate systems in WMS and WFS services.
- Export feature layer using field display names (aliases) instead of keynames.
- Support for CORS domain wildcards (like ``https://*.csb.app``).
- WFS client and server simple filters support.
- Improved handling of coordinates outside boundaries of coordinate systems.
- Support for 25D geometries in PostGIS layers.
- Ability to filter NULL values in feature REST API.
- Unknown fields in REST API filters return an error.
- Improved handling of external services errors and timeouts.
- Upgraded dependencies: Pyramid 2.0, SQLAlchemy 1.4, and OpenLayers 6.10


4.0.0
-----

- Source layer selection while creating vector layers from multi-layer sources, 
  such as ZIP-archives or Mapinfo TABs.
- On-the-fly reprojection for WMS and WFS services.
- Ability to restrict address search by a country if using Nominatim.
- Hide inaccessible layers while displaying web maps.
- Highlight feature when selecting from search results.
- Display emails as active ``mailto:`` links in the webmap popup.
- Ability to delete users and groups from the control panel.
- Ability to change resource owner in UI and REST API.
- Automatic generation of keynames for WMS and WFS services.
- Improved support for Unicode field names for WFS services.
- Granular control setting for resource export availability.
- ISO-8601 date and time formatting in feature layer REST API via
  ``dt_format=iso`` option.
- Drop Python 2.7 support, NextGIS Web now requires Python 3.8+.
- PostgreSQL 10+, PostGIS 2.5+ and GDAL 3.0+ are required now.
- Synchronization of translations with POEditor.
- Yandex Maps-based address search on the webmap.


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
