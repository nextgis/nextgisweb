.. sectionauthor:: Dmitry Baryshnikov <dmitry.baryshnikov@nextgis.ru>

.. _ngwdev_file_upload:

File upload
=====================

Single file upload
-------------------

Execute folowing request to upload a file:

..  http:post:: /api/component/file_upload/

    File upload request.

    :form file: file data
    :form name: file name
    :statuscode 200: no error

Next multipart POST request follow. Request includes following form parameters:
`name` = "file name"

**Example request**:

.. sourcecode:: http

   POST /api/component/file_upload/ HTTP/1.1
   Host: ngw_url
   Accept: */*

   file=\tmp\test.file&name=testfile

Response in JSON format with file details returned on success:

**Example response body**:

.. sourcecode:: json

    {
      "upload_meta": [
        {
          "id": "0eddf759-86d3-4fe0-b0f1-869fe783d2ed",
          "mime_type": "application/octet-stream",
          "name": "ngw1_1.zip",
          "size": 2299
        }
      ]
    }

Also you can create attachment using PUT method, in this case you do not need to set file name

**Example add attachment to feature on Python**:

.. sourcecode:: python

    import requests
    from contextlib import closing
    import json
    
    url_dst = 'https://sandbox.nextgis.com'
    ngw_creds = ('administrator', 'demodemo')
    feature_dst = '/api/resource/' + '3605' + '/feature/'   #layer id
    new_id = '2'          #feature id
    
    #Get file from internet, optionally with auth
    with closing(requests.get('https://nextgis.ru/wp-content/themes/nextgisclean_wptheme/main-assets/img-en/header/logo.png', auth=ngw_creds, stream=True)) as f:
    
        #upload attachment to nextgisweb
        req = requests.put(url_dst + '/api/component/file_upload/', data=f.content, auth=ngw_creds)
        req.raise_for_status()
        #on some servers needed data=f.content instead
    
    
        attach_data = {}
        attach_data['file_upload'] = req.json()
        attach_data['name'] = 'Picture.png'
    
        #add attachment to nextgisweb feature
        url=url_dst + feature_dst + str(new_id) + '/attachment/'
        req = requests.post(url, data=json.dumps(attach_data), auth=ngw_creds)
        req.raise_for_status()



**Example of forming multipart POST body in Qt**:

.. sourcecode:: c++

    QHttpMultiPart *multipart = new QHttpMultiPart(QHttpMultiPart::FormDataType);

    QHttpPart part;
    part.setHeader(QNetworkRequest::ContentDispositionHeader,
                   QVariant("form-data; name=\"file\"; filename=\"form.ngfp\""));
    part.setHeader(QNetworkRequest::ContentTypeHeader,
                   QVariant("application/octet-stream"));
    part.setBody(file_contents); // pass QByteArray reference

    multipart->append(part);


Multiple file upload
--------------------

For multiple file upload execute the following request:

..  http:post:: /api/component/file_upload/

    Multiple files upload request

    :form name: must be "files[]"

In ``name`` field must be file name and path (multipart POST request).

Response in JSON format with files details returned on success:

**Example response body**:

.. sourcecode:: json

    {
      "upload_meta": [
        {
          "id": "b5c02d94-e1d7-40cf-b9c7-79bc9cca429d",
          "mime_type": "application/octet-stream",
          "name": "grunt_area_2_multipolygon.cpg",
          "size": 5
        },
        {
          "id": "d8457f14-39cb-4f9d-bb00-452a381fa62e",
          "mime_type": "application/x-dbf",
          "name": "grunt_area_2_multipolygon.dbf",
          "size": 36607
        },
        {
          "id": "1b0754f8-079d-4675-9367-36531da247e1",
          "mime_type": "application/octet-stream",
          "name": "grunt_area_2_multipolygon.prj",
          "size": 138
        },
        {
          "id": "a34b5ab3-f3a5-4a60-835d-318e601d34df",
          "mime_type": "application/x-esri-shape",
          "name": "grunt_area_2_multipolygon.shp",
          "size": 65132
        },
        {
          "id": "fb439bfa-1a63-4384-957d-ae57bb5eb67b",
          "mime_type": "application/x-esri-shape",
          "name": "grunt_area_2_multipolygon.shx",
          "size": 1324
        }
      ]
    }
