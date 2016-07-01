Code snippets
=============

Update feature fields in vector layer
-------------------------------------

.. code-block:: python

    from nextgisweb import DBSession
    from nextgisweb.vector_layer import VectorLayer

    def update_any_field():
        # start session and transaction
        ngw_session = DBSession()
        transaction.manager.begin()

        # get vector layer
        layer = ngw_session.query(VectorLayer).first()

        if not layer:
            return

        # get features
        query = layer.feature_query()

        # enumerate features
        for feat in query():
            # set value for field (make sure that the field exists in the layer!)
            feat.fields['test'] = 'new_value'
            # save to layer
            layer.feature_put(feat)

        # commit all changes
        transaction.manager.commit()
