from typing import Annotated, Any, Literal

import sqlalchemy as sa
from msgspec import UNSET, Meta, Struct, UnsetType
from sqlalchemy import func, select

from .dtutil import DT_DATATYPES, DT_DUMPERS
from .interface import FIELD_TYPE
from .numutil import BIGINT_DUMPERS


class MinMaxSpec(Struct, tag="min_max", tag_field="type", kw_only=True):
    field: str | int


class UniqueValuesSpec(Struct, tag="unique_values", tag_field="type", kw_only=True):
    field: str | int
    limit: Annotated[int, Meta(ge=1, le=1000)] = 100
    order: Literal["value_asc", "value_desc", "count_asc", "count_desc"] = "value_asc"
    include_counts: bool = True


AggregationSpec = MinMaxSpec | UniqueValuesSpec


class MinMaxResult(Struct, tag="min_max", tag_field="type", kw_only=True):
    min: Any
    max: Any


class UniqueValuesBucket(Struct, kw_only=True):
    key: Any
    count: int | UnsetType = UNSET


class UniqueValuesResult(Struct, tag="unique_values", tag_field="type", kw_only=True):
    buckets: list[UniqueValuesBucket]
    overflow: bool


AggregationResult = MinMaxResult | UniqueValuesResult


class Aggregation:
    identity: str
    display_name: str


class MinMaxAggregation(Aggregation):
    identity = "min_max"
    display_name = "Field minimum and maximum"


class UniqueValuesAggregation(Aggregation):
    identity = "unique_values"
    display_name = "Unique field values"


def dump_field_value(datatype, value):
    if value is None:
        return None
    if datatype in DT_DATATYPES:
        return DT_DUMPERS["iso"][datatype](value)
    if datatype == FIELD_TYPE.BIGINT:
        return BIGINT_DUMPERS["compat"](value)
    return value


class ScalarAggregation:
    """Mixin for scalar aggregations batchable into a single SELECT."""

    def __init__(self, resource):
        self.resource = resource

    def sql_columns(self, col_map, spec, prefix: str) -> list:
        raise NotImplementedError

    def extract_result(self, row, spec, prefix: str):
        raise NotImplementedError


class PgMinMaxAggregation(MinMaxAggregation, ScalarAggregation):
    def sql_columns(self, col_map, spec: MinMaxSpec, prefix):
        col = col_map[spec.field]
        return [func.min(col).label(f"{prefix}_min"), func.max(col).label(f"{prefix}_max")]

    def extract_result(self, row, spec: MinMaxSpec, prefix) -> MinMaxResult:
        field = self.resource.field_by_keyname(spec.field)
        return MinMaxResult(
            min=dump_field_value(field.datatype, getattr(row, f"{prefix}_min")),
            max=dump_field_value(field.datatype, getattr(row, f"{prefix}_max")),
        )


class PgUniqueValuesAggregation(UniqueValuesAggregation):
    def __init__(self, resource):
        self.resource = resource

    def execute_aggregate(
        self, col_map, where, spec: UniqueValuesSpec, execute
    ) -> UniqueValuesResult:
        field_col = col_map[spec.field]
        count_col = func.count().label("count")
        query = select(field_col.label("val"), count_col).group_by(field_col)

        if where:
            query = query.where(sa.and_(*where))

        match spec.order:
            case "value_asc":
                query = query.order_by(sa.nullsfirst(field_col.asc()))
            case "value_desc":
                query = query.order_by(sa.nullslast(field_col.desc()))
            case "count_desc":
                query = query.order_by(count_col.desc(), sa.nullsfirst(field_col.asc()))
            case "count_asc":
                query = query.order_by(count_col.asc(), sa.nullsfirst(field_col.asc()))

        query = query.limit(spec.limit + 1)
        rows = execute(query).all()
        overflow = len(rows) > spec.limit

        field = self.resource.field_by_keyname(spec.field)
        buckets = [
            UniqueValuesBucket(
                key=dump_field_value(field.datatype, row.val),
                count=row.count if spec.include_counts else UNSET,
            )
            for row in rows[: spec.limit]
        ]
        return UniqueValuesResult(buckets=buckets, overflow=overflow)


def pg_batch_scalars(col_map, where, scalar_specs, execute):
    """Execute scalar aggregations in one SELECT.

    Accepts abstract (col_map, where, execute) so this helper can be reused by
    any PostgreSQL-backed layer type (vector layer, PostGIS, etc.).
    """
    all_columns = []
    labeled = []
    for i, (idx, agg, spec) in enumerate(scalar_specs):
        prefix = f"a{i}"
        all_columns.extend(agg.sql_columns(col_map, spec, prefix))
        labeled.append((idx, agg, spec, prefix))

    query = select(*all_columns)
    if where:
        query = query.where(sa.and_(*where))

    row = execute(query).one()
    return {idx: agg.extract_result(row, spec, prefix) for idx, agg, spec, prefix in labeled}
