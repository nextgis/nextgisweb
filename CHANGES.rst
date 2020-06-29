Changes
=======

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
