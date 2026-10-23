use std::num::NonZeroU32;

use geo_types::{
    Coord, Geometry, GeometryCollection, LineString, MultiLineString, MultiPoint, MultiPolygon,
    Point, Polygon,
};
use map_tile_toolkit::{Slicer, TileId};
use mlt_core::fast_mvt::{
    MvtFeatureBuilder, MvtGeomType, MvtLayerBuilder, MvtTileBuilder, MvtValueRef,
};
use pyo3::exceptions::{PyTypeError, PyValueError};
use pyo3::prelude::*;
use pyo3::types::{PyAny, PyBool, PyDict, PyFloat, PyInt, PyString};

const TILE: TileId = TileId { x: 0, y: 0 };

struct Wkb<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Wkb<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, pos: 0 }
    }

    fn u8(&mut self) -> Result<u8, String> {
        let v = *self.data.get(self.pos).ok_or("truncated WKB")?;
        self.pos += 1;
        Ok(v)
    }

    fn u32(&mut self, le: bool) -> Result<u32, String> {
        let b = self
            .data
            .get(self.pos..self.pos + 4)
            .ok_or("truncated WKB")?;
        self.pos += 4;
        Ok(if le {
            u32::from_le_bytes(b.try_into().unwrap())
        } else {
            u32::from_be_bytes(b.try_into().unwrap())
        })
    }

    fn f64(&mut self, le: bool) -> Result<f64, String> {
        let b = self
            .data
            .get(self.pos..self.pos + 8)
            .ok_or("truncated WKB")?;
        self.pos += 8;
        Ok(if le {
            f64::from_le_bytes(b.try_into().unwrap())
        } else {
            f64::from_be_bytes(b.try_into().unwrap())
        })
    }

    fn skip(&mut self, n: usize) -> Result<(), String> {
        if self.pos + n > self.data.len() {
            return Err("truncated WKB".into());
        }
        self.pos += n;
        Ok(())
    }

    fn coord(&mut self, le: bool, has_z: bool, has_m: bool) -> Result<Coord<f64>, String> {
        let x = self.f64(le)?;
        let y = self.f64(le)?;
        if has_z {
            self.skip(8)?;
        }
        if has_m {
            self.skip(8)?;
        }
        Ok(Coord { x, y })
    }

    fn geometry(&mut self) -> Result<Geometry<f64>, String> {
        let endian = self.u8()?;
        if endian != 0 && endian != 1 {
            return Err(format!("unsupported WKB byte order: {endian}"));
        }
        let le = endian == 1;
        let raw_type = self.u32(le)?;

        let ewkb_z = raw_type & 0x8000_0000 != 0;
        let ewkb_m = raw_type & 0x4000_0000 != 0;
        let srid = raw_type & 0x2000_0000 != 0;
        let typ = raw_type & 0x0FFF_FFFF;
        let iso_dim = typ / 1000;
        let base = typ % 1000;

        let has_z = ewkb_z || iso_dim == 1 || iso_dim == 3;
        let has_m = ewkb_m || iso_dim == 2 || iso_dim == 3;
        if srid {
            self.u32(le)?;
        }

        match base {
            1 => Ok(Geometry::Point(Point(self.coord(le, has_z, has_m)?))),
            2 => {
                let n = self.u32(le)? as usize;
                let mut points = Vec::with_capacity(n);
                for _ in 0..n {
                    points.push(self.coord(le, has_z, has_m)?);
                }
                Ok(Geometry::LineString(LineString(points)))
            }
            3 => {
                let n = self.u32(le)? as usize;
                let mut rings = Vec::with_capacity(n);
                for _ in 0..n {
                    let m = self.u32(le)? as usize;
                    let mut points = Vec::with_capacity(m);
                    for _ in 0..m {
                        points.push(self.coord(le, has_z, has_m)?);
                    }
                    rings.push(LineString(points));
                }
                if rings.is_empty() {
                    Ok(Geometry::Polygon(Polygon::new(LineString(vec![]), vec![])))
                } else {
                    let exterior = rings.remove(0);
                    Ok(Geometry::Polygon(Polygon::new(exterior, rings)))
                }
            }
            4 => {
                let n = self.u32(le)? as usize;
                let mut points = Vec::with_capacity(n);
                for _ in 0..n {
                    match self.geometry()? {
                        Geometry::Point(p) => points.push(p),
                        other => return Err(format!("unexpected MultiPoint member: {other:?}")),
                    }
                }
                Ok(Geometry::MultiPoint(MultiPoint(points)))
            }
            5 => {
                let n = self.u32(le)? as usize;
                let mut lines = Vec::with_capacity(n);
                for _ in 0..n {
                    match self.geometry()? {
                        Geometry::LineString(l) => lines.push(l),
                        other => {
                            return Err(format!("unexpected MultiLineString member: {other:?}"));
                        }
                    }
                }
                Ok(Geometry::MultiLineString(MultiLineString(lines)))
            }
            6 => {
                let n = self.u32(le)? as usize;
                let mut polygons = Vec::with_capacity(n);
                for _ in 0..n {
                    match self.geometry()? {
                        Geometry::Polygon(p) => polygons.push(p),
                        other => return Err(format!("unexpected MultiPolygon member: {other:?}")),
                    }
                }
                Ok(Geometry::MultiPolygon(MultiPolygon(polygons)))
            }
            7 => {
                let n = self.u32(le)? as usize;
                let mut geoms = Vec::with_capacity(n);
                for _ in 0..n {
                    geoms.push(self.geometry()?);
                }
                Ok(Geometry::GeometryCollection(GeometryCollection(geoms)))
            }
            other => Err(format!("unsupported WKB geometry type: {other}")),
        }
    }
}

fn tile_point(p: Coord<f64>, bbox: (f64, f64, f64, f64), extent: f64) -> Coord<i32> {
    let (minx, miny, maxx, maxy) = bbox;
    let sx = extent / (maxx - minx);
    let sy = extent / (maxy - miny);
    Coord {
        x: ((p.x - minx) * sx).round() as i32,
        y: ((maxy - p.y) * sy).round() as i32,
    }
}

fn add_geometry(
    geom: Geometry<f64>,
    bbox: (f64, f64, f64, f64),
    extent: f64,
    points: &mut Vec<Coord<i32>>,
    lines: &mut Vec<Vec<Coord<i32>>>,
    polygons: &mut Vec<Vec<Vec<Coord<i32>>>>,
) -> Result<(), String> {
    let convert = |c: Coord<f64>| {
        if c.x.is_finite() && c.y.is_finite() {
            Some(tile_point(c, bbox, extent))
        } else {
            None
        }
    };

    match geom {
        Geometry::Point(p) => {
            if let Some(c) = convert(p.0) {
                points.push(c);
            }
        }
        Geometry::MultiPoint(mp) => {
            for p in mp.0 {
                if let Some(c) = convert(p.0) {
                    points.push(c);
                }
            }
        }
        Geometry::LineString(l) => {
            let line: Vec<_> = l.0.into_iter().filter_map(convert).collect();
            if line.len() >= 2 {
                lines.push(line);
            }
        }
        Geometry::MultiLineString(ml) => {
            for l in ml.0 {
                let line: Vec<_> = l.0.into_iter().filter_map(convert).collect();
                if line.len() >= 2 {
                    lines.push(line);
                }
            }
        }
        Geometry::Polygon(p) => add_polygon(p, bbox, extent, polygons),
        Geometry::MultiPolygon(mp) => {
            for p in mp.0 {
                add_polygon(p, bbox, extent, polygons);
            }
        }
        Geometry::GeometryCollection(gc) => {
            for g in gc.0 {
                add_geometry(g, bbox, extent, points, lines, polygons)?;
            }
        }
        other => return Err(format!("unsupported geometry: {other:?}")),
    }
    Ok(())
}

fn add_polygon(
    p: Polygon<f64>,
    bbox: (f64, f64, f64, f64),
    extent: f64,
    polygons: &mut Vec<Vec<Vec<Coord<i32>>>>,
) {
    let convert = |c: Coord<f64>| {
        if c.x.is_finite() && c.y.is_finite() {
            Some(tile_point(c, bbox, extent))
        } else {
            None
        }
    };
    let mut rings = Vec::new();
    let exterior: Vec<_> = p.exterior().0.iter().copied().filter_map(convert).collect();
    if exterior.len() >= 3 {
        rings.push(exterior);
        for ring in p.interiors() {
            let ring: Vec<_> = ring.0.iter().copied().filter_map(convert).collect();
            if ring.len() >= 3 {
                rings.push(ring);
            }
        }
    }
    if !rings.is_empty() {
        polygons.push(rings);
    }
}
/// Geometry of a single feature in tile coordinates, clipped to the buffered
/// tile. A mixed geometry collection yields several non-empty parts, which
/// are encoded as separate MVT features with the same id (like GDAL does).
#[derive(Default)]
struct Prepared {
    points: Vec<Coord<i32>>,
    lines: Vec<Vec<Coord<i32>>>,
    rings: Vec<(Vec<Coord<i32>>, bool)>,
}

impl Prepared {
    fn is_empty(&self) -> bool {
        self.points.is_empty() && self.lines.is_empty() && self.rings.is_empty()
    }
}

fn prepare(
    wkb: &[u8],
    bbox: (f64, f64, f64, f64),
    extent: u32,
    buffer: u16,
) -> Result<Prepared, String> {
    let mut reader = Wkb::new(wkb);
    let geom = reader.geometry()?;
    let mut points = Vec::new();
    let mut lines = Vec::new();
    let mut polygons = Vec::new();
    add_geometry(
        geom,
        bbox,
        f64::from(extent),
        &mut points,
        &mut lines,
        &mut polygons,
    )?;

    let mut slicer = Slicer::new(extent, buffer).map_err(|e| e.to_string())?;
    let mut out = Prepared::default();

    for p in points {
        if let Some(local) = slicer.tile_point(TILE, p).map_err(|e| e.to_string())? {
            out.points.push(local);
        }
    }

    for line in lines {
        let runs = slicer.tile_line(TILE, &line).map_err(|e| e.to_string())?;
        for slice in runs {
            let run: Vec<_> = slice.run().iter().collect();
            if run.len() >= 2 {
                out.lines.push(run);
            }
        }
    }

    for polygon in polygons {
        if let Some(piece) = slicer
            .tile_polygon(TILE, &polygon)
            .map_err(|e| e.to_string())?
        {
            for (idx, ring) in piece.rings().enumerate() {
                let ring: Vec<_> = ring.iter().collect();
                if ring.len() >= 4 {
                    out.rings.push((ring, idx == 0));
                }
            }
        }
    }

    Ok(out)
}

/// Attribute value converted from Python while holding the GIL.
enum Value {
    Bool(bool),
    Int(i64),
    UInt(u64),
    Double(f64),
    String(String),
}

impl Value {
    fn as_ref(&self) -> MvtValueRef<'_> {
        match self {
            Value::Bool(v) => MvtValueRef::Bool(*v),
            Value::Int(v) if *v >= 0 => MvtValueRef::UInt(*v as u64),
            Value::Int(v) => MvtValueRef::SInt(*v),
            Value::UInt(v) => MvtValueRef::UInt(*v),
            Value::Double(v) => MvtValueRef::Double(*v),
            Value::String(v) => MvtValueRef::String(v),
        }
    }
}

struct Feature {
    fid: Option<u64>,
    wkb: Vec<u8>,
    props: Vec<(String, Value)>,
}

struct Layer {
    name: String,
    features: Vec<Feature>,
}

fn extract_value(key: &str, value: &Bound<PyAny>) -> PyResult<Option<Value>> {
    if value.is_none() {
        Ok(None)
    } else if value.is_instance_of::<PyBool>() {
        Ok(Some(Value::Bool(value.extract()?)))
    } else if value.is_instance_of::<PyInt>() {
        if let Ok(v) = value.extract::<i64>() {
            Ok(Some(Value::Int(v)))
        } else {
            Ok(Some(Value::UInt(value.extract()?)))
        }
    } else if value.is_instance_of::<PyFloat>() {
        Ok(Some(Value::Double(value.extract()?)))
    } else if value.is_instance_of::<PyString>() {
        Ok(Some(Value::String(value.extract()?)))
    } else {
        Err(PyTypeError::new_err(format!(
            "unsupported value type for property '{key}': {}",
            value.get_type().name()?
        )))
    }
}

fn extract_feature(item: &Bound<PyAny>) -> PyResult<Feature> {
    let (fid, wkb, props): (Option<u64>, Vec<u8>, Bound<PyDict>) = item.extract()?;
    let mut values = Vec::with_capacity(props.len());
    for (key, value) in props.iter() {
        let key: String = key.extract()?;
        if let Some(value) = extract_value(&key, &value)? {
            values.push((key, value));
        }
    }
    Ok(Feature {
        fid,
        wkb,
        props: values,
    })
}

fn extract_layers(layers: &Bound<PyAny>) -> PyResult<Vec<Layer>> {
    let mut result = Vec::new();
    for item in layers.try_iter()? {
        let (name, features): (String, Bound<PyAny>) = item?.extract()?;
        let mut layer = Layer {
            name,
            features: Vec::new(),
        };
        for feature in features.try_iter()? {
            layer.features.push(extract_feature(&feature?)?);
        }
        result.push(layer);
    }
    Ok(result)
}

fn encode(
    layers: Vec<Layer>,
    extent: u32,
    bbox: (f64, f64, f64, f64),
    buffer: u16,
) -> Result<Vec<u8>, String> {
    let extent_nz = NonZeroU32::new(extent).ok_or("extent must be positive")?;
    if !(bbox.2 > bbox.0 && bbox.3 > bbox.1) {
        return Err("invalid bbox".into());
    }

    let mut tile = MvtTileBuilder::new();
    for layer in layers {
        let mut prepared = Vec::with_capacity(layer.features.len());
        for feature in &layer.features {
            let geom =
                prepare(&feature.wkb, bbox, extent, buffer).map_err(|e| match feature.fid {
                    Some(fid) => format!("feature {fid}: {e}"),
                    None => format!("feature: {e}"),
                })?;
            if !geom.is_empty() {
                prepared.push((feature, geom));
            }
        }

        // Skip empty layers, so a tile without features encodes to nothing
        if prepared.is_empty() {
            continue;
        }

        let mut lb = tile.layer(layer.name).map_err(|e| e.to_string())?;
        lb.extent(extent_nz);

        for (feature, geom) in prepared {
            let Prepared {
                points,
                lines,
                rings,
            } = geom;

            if !points.is_empty() {
                let mut fb = lb.feature_of(MvtGeomType::Point);
                fb.points(points).map_err(|e| e.to_string())?;
                lb = end_feature(fb, feature)?;
            }
            if !lines.is_empty() {
                let mut fb = lb.feature_of(MvtGeomType::LineString);
                for line in lines {
                    fb.line(line).map_err(|e| e.to_string())?;
                }
                lb = end_feature(fb, feature)?;
            }
            if !rings.is_empty() {
                let mut fb = lb.feature_of(MvtGeomType::Polygon);
                for (ring, exterior) in rings {
                    fb.ring(ring, exterior).map_err(|e| e.to_string())?;
                }
                lb = end_feature(fb, feature)?;
            }
        }

        tile = lb.end();
    }

    Ok(tile.encode())
}

fn end_feature(mut fb: MvtFeatureBuilder, feature: &Feature) -> Result<MvtLayerBuilder, String> {
    fb.id(feature.fid);
    for (key, value) in &feature.props {
        fb.tag_ref(key, value.as_ref()).map_err(|e| e.to_string())?;
    }
    Ok(fb.end())
}

/// Encode features into a Mapbox Vector Tile.
///
/// `layers` is an iterable of `(name, features)` pairs, and `features` is an
/// iterable of `(fid, wkb, properties)` tuples. Geometries must be in the same
/// SRS as `bbox`, which is the exact (unbuffered) tile extent. Property values
/// must be `None`, `bool`, `int`, `float` or `str`.
///
/// Empty layers are omitted. If there are no features at all, returns empty
/// bytes. The GIL is released while geometries are clipped and encoded.
#[pyfunction]
#[pyo3(signature = (layers, extent, bbox, buffer = 80))]
fn encode_tile(
    py: Python<'_>,
    layers: &Bound<'_, PyAny>,
    extent: u32,
    bbox: (f64, f64, f64, f64),
    buffer: u16,
) -> PyResult<Vec<u8>> {
    let layers = extract_layers(layers)?;
    py.detach(move || encode(layers, extent, bbox, buffer))
        .map_err(PyValueError::new_err)
}

#[pymodule]
fn ngw_mvt(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(encode_tile, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const BBOX: (f64, f64, f64, f64) = (0.0, 0.0, 4096.0, 4096.0);

    fn wkb_point_le(x: f64, y: f64) -> Vec<u8> {
        let mut b = vec![1];
        b.extend(1u32.to_le_bytes());
        b.extend(x.to_le_bytes());
        b.extend(y.to_le_bytes());
        b
    }

    fn wkb_linestring_le(coords: &[(f64, f64)]) -> Vec<u8> {
        let mut b = vec![1];
        b.extend(2u32.to_le_bytes());
        b.extend((coords.len() as u32).to_le_bytes());
        for (x, y) in coords {
            b.extend(x.to_le_bytes());
            b.extend(y.to_le_bytes());
        }
        b
    }

    fn read(wkb: &[u8]) -> Result<Geometry<f64>, String> {
        Wkb::new(wkb).geometry()
    }

    #[test]
    fn wkb_point_byte_orders() {
        let le = wkb_point_le(1.5, -2.0);
        assert_eq!(read(&le).unwrap(), Geometry::Point(Point::new(1.5, -2.0)));

        let mut be = vec![0];
        be.extend(1u32.to_be_bytes());
        be.extend(1.5f64.to_be_bytes());
        be.extend((-2.0f64).to_be_bytes());
        assert_eq!(read(&be).unwrap(), Geometry::Point(Point::new(1.5, -2.0)));
    }

    #[test]
    fn wkb_z_m_and_srid() {
        // ISO PointZM (3001)
        let mut iso = vec![1];
        iso.extend(3001u32.to_le_bytes());
        for v in [1.0f64, 2.0, 3.0, 4.0] {
            iso.extend(v.to_le_bytes());
        }
        assert_eq!(read(&iso).unwrap(), Geometry::Point(Point::new(1.0, 2.0)));

        // EWKB PointZ with SRID
        let mut ewkb = vec![1];
        ewkb.extend((1u32 | 0x8000_0000 | 0x2000_0000).to_le_bytes());
        ewkb.extend(3857u32.to_le_bytes());
        for v in [1.0f64, 2.0, 3.0] {
            ewkb.extend(v.to_le_bytes());
        }
        assert_eq!(read(&ewkb).unwrap(), Geometry::Point(Point::new(1.0, 2.0)));
    }

    #[test]
    fn wkb_errors() {
        let wkb = wkb_point_le(1.0, 2.0);
        assert!(read(&wkb[..wkb.len() - 1]).is_err());
        assert!(read(&[2, 1, 0, 0, 0]).is_err());

        let mut circular = vec![1];
        circular.extend(8u32.to_le_bytes());
        assert!(read(&circular).is_err());
    }

    #[test]
    fn prepare_clips_to_buffer() {
        let inside = prepare(&wkb_point_le(100.0, 100.0), BBOX, 4096, 80).unwrap();
        assert_eq!(inside.points, vec![Coord { x: 100, y: 3996 }]);

        let outside = prepare(&wkb_point_le(-1000.0, 100.0), BBOX, 4096, 80).unwrap();
        assert!(outside.is_empty());

        let crossing = wkb_linestring_le(&[(-1000.0, 100.0), (1000.0, 100.0)]);
        assert_eq!(prepare(&crossing, BBOX, 4096, 80).unwrap().lines.len(), 1);

        let missing = wkb_linestring_le(&[(-1000.0, 100.0), (-500.0, 200.0)]);
        assert!(prepare(&missing, BBOX, 4096, 80).unwrap().is_empty());
    }

    #[test]
    fn prepare_splits_mixed_collection() {
        let mut gc = vec![1];
        gc.extend(7u32.to_le_bytes());
        gc.extend(2u32.to_le_bytes());
        gc.extend(wkb_point_le(10.0, 10.0));
        gc.extend(wkb_linestring_le(&[(10.0, 10.0), (20.0, 20.0)]));

        let prepared = prepare(&gc, BBOX, 4096, 80).unwrap();
        assert_eq!(prepared.points.len(), 1);
        assert_eq!(prepared.lines.len(), 1);
        assert!(prepared.rings.is_empty());
    }

    #[test]
    fn encode_skips_empty_layers() {
        let layers = vec![Layer {
            name: "empty".into(),
            features: vec![Feature {
                fid: Some(1),
                wkb: wkb_point_le(-10000.0, 0.0),
                props: vec![],
            }],
        }];
        assert!(encode(layers, 4096, BBOX, 80).unwrap().is_empty());
    }

    #[test]
    fn encode_multiple_layers() {
        let layer = |name: &str| Layer {
            name: name.into(),
            features: vec![Feature {
                fid: Some(1),
                wkb: wkb_point_le(10.0, 10.0),
                props: vec![("a".into(), Value::Int(-1))],
            }],
        };
        let single = encode(vec![layer("a")], 4096, BBOX, 80).unwrap();
        let double = encode(vec![layer("a"), layer("b")], 4096, BBOX, 80).unwrap();
        assert!(!single.is_empty());
        assert!(double.len() > single.len());
        assert!(encode(vec![], 0, BBOX, 80).is_err());
    }
}
