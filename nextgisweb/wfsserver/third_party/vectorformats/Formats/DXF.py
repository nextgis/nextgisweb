
from vectorformats.Formats.Format import Format
import StringIO
from dxfwrite import DXFEngine as dxf

class DXF(Format):
    
    _drawing = None
    
    def encode(self, features, **kwargs):
        tmpFile = kwargs["tmpFile"]
        
        if len(features) > 0:
            self._drawing = dxf.drawing(tmpFile)
            self._drawing.add_layer("featureserver")

            for feature in features:
                self.encode_feature(feature)
    
            self._drawing.save()

        return self._drawing


    def encode_feature(self, feature):
        if feature["geometry"]["type"] == "Point":
            self._drawing.add(dxf.point(point=(feature["geometry"]["coordinates"][0],feature["geometry"]["coordinates"][1])))
        
        elif feature["geometry"]["type"] == "LineString":
            polyline= dxf.polyline()
            coords = feature["geometry"]["coordinates"]
            for coord in coords:
                polyline.add_vertex((coord[0], coord[1]))
            self._drawing.add(polyline)

        elif feature["geometry"]["type"] == "Polygon":
            polygon = dxf.polyline()
            
            coords = feature["geometry"]["coordinates"]
            for coord in coords:
                for point in coord:
                    polygon.add_vertex((point[0], point[1]))
                polygon.close()
            self._drawing.add(polygon)
		
