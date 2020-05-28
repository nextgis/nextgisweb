.. sectionauthor:: Artem Svetlov <artem.svetlov@nextgis.ru>

.. _ngwdev_ogr2ogr:

ogr2ogr
==================

Layer creation, upload, refresh and download can be performed through ngw driver in ogr2ogr console program 

https://gdal.org/drivers/vector/ngw.html

Code snippets:

Update vector layer in ngw from local geojson file

.. sourcecode:: bash

   layer_url=https://sandbox.nextgis.com/resource/4968
   layer_name=preview
   login=administrator
   password=demodemo
   
   #delete all features from NGW layer
   ogrinfo -oo "USERPWD=$login:$password" NGW:$layer_url -sql "DELETE FROM $layer_name"
   
   #add features to ngw layer from geojson
   ogr2ogr -f NGW -nln "$layer_name"  -append -doo "USERPWD=$login:$password" \
   -doo "BATCH_SIZE=100" -t_srs EPSG:3857 "NGW:$layer_url" preview.geojson

