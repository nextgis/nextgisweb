from pyramid.renderers import render_to_response

from ..models import DBSession
from ..object_widget import ObjectWidget


class DeleteWidget(ObjectWidget):

    def widget_module(self):
        return 'ngw-pyramid/modelWidget/Widget'
