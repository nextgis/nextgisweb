from FeatureServer.Service.Request import Request
import vectorformats.Formats.HTML

class HTML (Request):    
    #def encode_metadata(self, action):
    #    layers = self.service.datasources
    #    if self.service.metadata.has_key("metadata_template"):
    #        self.metadata_template = self.service.metadata['metadata_template']
            
    #    template = file(self.metadata_template).read()
    #    output = Template(template, searchList = [{'layers': layers, 'datasource':self.datasources[0]}, self])
    #    return  "text/html; charset=utf-8", str(output).decode("utf-8")

    def encode(self, result):
        html = vectorformats.Formats.HTML.HTML(datasource=self.service.datasources[self.datasources[0]])
        
        output = html.encode(result)
        
        return ("text/html; charset=utf-8", str(output).decode("utf-8"), None, 'utf-8')
    
    def encode_exception_report(self, exceptionReport):
        html = vectorformats.Formats.HTML.HTML()
        
        output = html.encode_exception_report(exceptionReport)
        
        return ("text/html; charset=utf-8", str(output).decode("utf-8"), None, 'utf-8')
    
