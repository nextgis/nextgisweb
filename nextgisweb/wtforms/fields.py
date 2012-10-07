# -*- coding: utf-8 -*-
from wtforms.fields import *
from wtforms.ext.sqlalchemy.fields import *


class KeynameField(TextField):

    def __init__(self, label=u"Ключ", validators=[], **kwargs):
        def f_validate(form, field):
            import re
            from . import validators
            if field.data and not re.match(ur'[A-Za-z][A-Za-z0-9_]', field.data):
                raise validators.ValidationError(u"Ключевое имя должно состоять из латинских букв, цифр, знака подчеркивания и должно начинаться с буквы.")

        def f_process(data):
            if data == '': 
                return None

        super(KeynameField, self).__init__(label, validators + [f_validate, ],  filters=(f_process, ), **kwargs)

