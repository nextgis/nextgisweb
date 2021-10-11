from ..resource import Resource, Widget


class SocialWidget(Widget):
    resource = Resource
    operation = ('create', 'update')
    amdmod = 'ngw-social/Widget'

    def is_applicable(self):
        return self.obj.check_social_editable() \
            and super().is_applicable()
