class Processing(object):
    def __init__(self, name, process, **kwargs):
        self.name = name
        self.process = process
        self.config_args = kwargs
        self.dispatch_args = [y[:-8] for y in  self.config_args if y.endswith("_default")]

    def dispatch(self, features=None, params=None):
        if features == None:
            features = []
        if params == None:
            params = {}
        
        kwargs = {}

        for arg in self.dispatch_args:
            if self.config_args.has_key("%s_default" % arg):
                kwargs[arg] = self.config_args['%s_default' % arg]
 
        for arg in self.dispatch_args:
            if self.config_args.has_key("%s_locked" % arg) and self.config_args['%s_locked' % arg].lower() in ['yes', 'y','true', '1']:
                continue
            key = "process_%s_%s" % (self.name, arg)    
            if params.has_key(key):
                kwargs[arg] = params[key]
        return self.process(features, **kwargs)    

def loadFromSection (config, section):
    mod = config.get(section, "module")
    cls = config.get(section, "class")
    mod_name = mod.split(".")[-1]
    module = __import__(mod, globals(), locals(), mod_name)
    action = getattr(module, cls)
    objargs = {}
    for opt in config.options(section):
        if opt not in  ["module", "class"]:
            objargs[opt] = config.get(section, opt)
    name = section[8:]
    p = Processing(name, action(), **objargs)
    return p
