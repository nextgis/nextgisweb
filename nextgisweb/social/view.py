from nextgisweb.resource import Resource, Widget


class SocialWidget(Widget):
    resource = Resource
    operation = ("create", "update")
    amdmod = "@nextgisweb/social/editor-widget"

    def is_applicable(self):
        return self.obj.check_social_editable() and super().is_applicable()

    def config(self):
        result = super().config()
        result["resourceId"] = self.obj.id
        return result
