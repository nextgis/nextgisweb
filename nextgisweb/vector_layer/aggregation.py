from nextgisweb.env import DBSession
from nextgisweb.lib.registry import DictRegistry

from nextgisweb.feature_layer.aggregation import (
    PgMinMaxAggregation,
    PgUniqueValuesAggregation,
    ScalarAggregation,
    pg_batch_scalars,
)

vector_aggregations = DictRegistry()


@vector_aggregations.register
class MinMaxAggregation(PgMinMaxAggregation):
    pass


@vector_aggregations.register
class UniqueValuesAggregation(PgUniqueValuesAggregation):
    pass


def aggregate(feature_query, specs):
    """Execute aggregations using the feature query's table and WHERE context."""
    _, _, col_map, where = feature_query.build_query_context()
    resource = feature_query.layer

    scalar_specs = []
    other_specs = []
    for idx, identity, spec in specs:
        impl = vector_aggregations[identity](resource)
        if isinstance(impl, ScalarAggregation):
            scalar_specs.append((idx, impl, spec))
        else:
            other_specs.append((idx, impl, spec))

    results = {}
    if scalar_specs:
        results.update(pg_batch_scalars(col_map, where, scalar_specs, DBSession.execute))
    for idx, impl, spec in other_specs:
        results[idx] = impl.execute_aggregate(col_map, where, spec, DBSession.execute)
    return results
