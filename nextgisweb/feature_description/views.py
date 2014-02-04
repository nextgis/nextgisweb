# -*- coding: utf-8 -*-
from ..object_widget import ObjectWidget

from .models import FeatureDescription


def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession

    class FeatureDescriptionEditWidget(ObjectWidget):
        identity = 'feature_description'

        # Слой, к которому привязан виджет. Должен быть
        # переопределен в дочернем классе
        layer = None

        def populate_obj(self):
            desc = FeatureDescription(
                layer_id=self.layer.id,
                feature_id=self.obj.id,
                value=self.data
            )
            DBSession.merge(desc)

        def widget_module(self):
            return 'feature_description/Widget'

        def widget_params(self):
            result = super(FeatureDescriptionEditWidget, self).widget_params()

            if self.obj:
                desc = DBSession.query(FeatureDescription) \
                    .get((self.layer.id, self.obj.id))
                if desc:
                    result['value'] = desc.value

            return result

    comp.FeatureDescriptionEditWidget = FeatureDescriptionEditWidget
