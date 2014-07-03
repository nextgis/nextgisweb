class Format(object):
    """Base Format class. To set properties on your subclasses, you can
       pass them as kwargs to your format constructor."""
    def __init__(self, *args, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
            
    def getFormatedAttributName(self, name):
        attrib_name = name
        
        attrib_pos = name.find(' as "')
        if attrib_pos >= 0:
            attrib_name = name[attrib_pos+5:-1]
            
        return attrib_name
    
    def escapeSQL(self, value):
        newValue = value
        newValue = value.replace("'", "''")
        
        return newValue 
    