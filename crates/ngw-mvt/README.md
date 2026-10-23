# nextgisweb-mvt

Optional native MVT encoder for NextGIS Web. When installed, it is used by the
`/api/component/feature_layer/mvt` endpoint instead of GDAL MVT driver. Set the
`feature_layer.mvt.native` option to `false` to fall back to GDAL.

The Python package exposes a single function:

```python
from ngw_mvt import encode_tile

data = encode_tile(
    [(layer_name, features), ...],
    extent,
    bbox,
    buffer=80,
)
```

`features` is an iterable of `(fid, wkb, properties)` tuples. `wkb` must
already be in EPSG:3857 and `bbox` is the exact tile extent in EPSG:3857.
`properties` values must be `None`, `bool`, `int`, `float` or `str`. `buffer` is
in tile units and must be less than a half of `extent`.

Empty layers are omitted and a tile without features is encoded as empty
bytes. Mixed geometry collections are split into several features with the
same id. The GIL is released while geometries are clipped and encoded.

The package version is taken from `Cargo.toml` and is bumped together with
NextGIS Web by `bump2version`.

Build a wheel with:

```bash
maturin build --release
```

Install it into the NextGIS Web virtualenv in development mode with:

```bash
pip install -e crates/ngw-mvt
```

Run Rust tests and lints with:

```bash
cargo test
cargo clippy --all-targets -- -D warnings
```
