# -*- coding: utf-8 -*-
from wtforms.form import BaseForm as WTBaseForm

from wtforms.compat import iteritems, with_metaclass

from . import fields
from . import validators

__all__ = ('Form', 'fields', 'validators')

class FormMeta(type):
    """
    The metaclass for `Form` and any subclasses of `Form`.

    `FormMeta`'s responsibility is to create the `_unbound_fields` list, which
    is a list of `UnboundField` instances sorted by their order of
    instantiation.  The list is created at the first instantiation of the form.
    If any fields are added/removed from the form, the list is cleared to be
    re-generated on the next instantiaton.

    Any properties which begin with an underscore or are not `UnboundField`
    instances are ignored by the metaclass.
    """
    def __init__(cls, name, bases, attrs):
        type.__init__(cls, name, bases, attrs)
        cls._unbound_fields = None

    def __call__(cls, *args, **kwargs):
        """
        Construct a new `Form` instance, creating `_unbound_fields` on the
        class if it is empty.
        """
        if cls._unbound_fields is None:
            fields = []
            for name in dir(cls):
                if not name.startswith('_'):
                    unbound_field = getattr(cls, name)
                    if hasattr(unbound_field, '_formfield'):
                        fields.append((name, unbound_field))
            # We keep the name as the second element of the sort
            # to ensure a stable sort.
            fields.sort(key=lambda x: (x[1].creation_counter, x[0]))
            cls._unbound_fields = fields
        return type.__call__(cls, *args, **kwargs)

    def __setattr__(cls, name, value):
        """
        Add an attribute to the class, clearing `_unbound_fields` if needed.
        """
        if not name.startswith('_') and hasattr(value, '_formfield'):
            cls._unbound_fields = None
        type.__setattr__(cls, name, value)

    def __delattr__(cls, name):
        """
        Remove an attribute from the class, clearing `_unbound_fields` if
        needed.
        """
        if not name.startswith('_'):
            cls._unbound_fields = None
        type.__delattr__(cls, name)



class BaseForm(WTBaseForm):

    # def process(self, formdata=None, obj=None, **kwargs):
    #     super(WTBaseForm, self).__init__(self, formdata=formdata, obj=obj, **kwargs)


    @property
    def data(self):
        print "++++"
        return dict((name, f.data) for name, f in iteritems(self._fields))


class Form(with_metaclass(FormMeta, BaseForm)):
    """
    Declarative Form base class. Extends BaseForm's core behaviour allowing
    fields to be defined on Form subclasses as class attributes.

    In addition, form and instance input data are taken at construction time
    and passed to `process()`.
    """

    def __init__(self, formdata=None, files=None, obj=None, prefix='', **kwargs):
        """
        :param formdata:
            Used to pass data coming from the enduser, usually `request.POST` or
            equivalent.
        :param obj:
            If `formdata` is empty or not provided, this object is checked for
            attributes matching form field names, which will be used for field
            values.
        :param prefix:
            If provided, all fields will have their name prefixed with the
            value.
        :param `**kwargs`:
            If `formdata` is empty or not provided and `obj` does not contain
            an attribute named the same as a field, form will assign the value
            of a matching keyword argument to the field, if one exists.
        """
        super(Form, self).__init__(self._unbound_fields, prefix=prefix)

        for name, field in iteritems(self._fields):
            # Set all the fields to attributes so that they obscure the class
            # attributes with the same names.
            setattr(self, name, field)


        if files and formdata:
            for k, v in files.items():
                if k in formdata:
                    formdata[k] = (newformdata[k], v)

        self.process(formdata, obj, **kwargs)

    def __iter__(self):
        """ Iterate form fields in their order of definition on the form. """
        for name, _ in self._unbound_fields:
            if name in self._fields:
                yield self._fields[name]

    def __setitem__(self, name, value):
        raise TypeError('Fields may not be added to Form instances, only classes.')

    def __delitem__(self, name):
        del self._fields[name]
        setattr(self, name, None)

    def __delattr__(self, name):
        try:
            self.__delitem__(name)
        except KeyError:
            super(Form, self).__delattr__(name)

    def validate(self):
        """
        Validates the form by calling `validate` on each field, passing any
        extra `Form.validate_<fieldname>` validators to the field validator.
        """
        extra = {}
        for name in self._fields:
            inline = getattr(self.__class__, 'validate_%s' % name, None)
            if inline is not None:
                extra[name] = [inline]

        return super(Form, self).validate(extra)