.. sectionauthor:: Artem Svetlov <artem.svetlov@nextgis.ru>

.. _ngwdev_ogr2ogr:

ogr2ogr
==================

Layer creation, upload, refresh and download can be performed through ngw driver in ogr2ogr console program 

https://gdal.org/drivers/vector/ngw.html

Code snippets:

Update vector layer in ngw from local geojson file

```
layer_url=https://sandbox.nextgis.com/resource/4968
layer_name=preview
login=administrator
password=demodemo

#delete all features from NGW layer
ogrinfo -oo "USERPWD=$login:$password" NGW:$layer_url -sql "DELETE FROM $layer_name"

#add features to ngw layer from geojson
ogr2ogr -f NGW -nln "$layer_name"  -append -doo "USERPWD=$login:$password" \
-doo "BATCH_SIZE=100" -t_srs EPSG:3857 "NGW:$layer_url" preview.geojson
```

https://github.com/nextgis/ngw_external_api_python/blob/9fd06b9a81a2018d3451fbb6f72a85e00d343e21/tests/client.py
