# -*- coding: utf-8 -*-


class Event:
    def __init__(self):
        self._handlers = set()

    def handle(self, handler):
        self._handlers.add(handler)
        return self

    def unhandle(self, handler):
        try:
            self._handlers.remove(handler)
        except:
            raise ValueError("Handler is not handling this event, so cannot unhandle it.")
        return self

    def fire(self, *args, **kargs):
        for handler in self._handlers:
            handler(*args, **kargs)

    def get_handlers_count(self):
        return len(self._handlers)

    __iadd__ = handle
    __isub__ = unhandle
    __call__ = fire
    __len__  = get_handlers_count


class SafetyEvent(Event):

    def fire(self, *args, **kargs):
        for handler in self._handlers:
            try:
                handler(*args, **kargs)
            except:
                pass

