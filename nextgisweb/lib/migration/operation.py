class BaseOperation(object):
    opname = 'base'
    oprank = 0

    def __init__(self, condition, action, migration=None, component=None, revision=None):
        self.condition = condition
        self.action = action
        self.migration = migration
        self.component = component if component is not None else (
            migration.component if migration is not None else None)
        self.revision = revision if revision is not None else (
            migration.revision if migration is not None else None)

    def apply(self, state):
        result = dict(state)
        result.update(self.action)
        return result


class ForwardOperation(BaseOperation):
    opname = 'forward'
    oprank = 1
    gvcolor = '"#92c5de"'

    def __init__(self, condition, action, migration):
        super().__init__(condition, action, migration=migration)

    def __str__(self):
        return "Forward [{}:{}]".format(self.component, self.revision)


class RewindOperation(BaseOperation):
    opname = 'rewind'
    oprank = 1
    gvinv = True
    gvcolor = '"#f4a582"'

    def __init__(self, condition, action, migration):
        super().__init__(condition, action, migration=migration)

    def __str__(self):
        return "Rewind [{}:{}]".format(self.component, self.revision)


class InstallOperation(BaseOperation):
    opname = 'install'
    oprank = 2
    gvinv = False
    gvcolor = '"#0571b0"'

    def __init__(self, condition, action, component):
        super().__init__(condition, action, component=component)

    def __str__(self):
        return "Install [{}]".format(self.component)


class UninstallOperation(BaseOperation):
    opname = 'uninstall'
    oprank = 2
    gvinv = True
    gvcolor = '"#ca0020"'

    def __init__(self, condition, action, component):
        super().__init__(condition, action, component=component)

    def __str__(self):
        return "Uninstall [{}]".format(self.component)
