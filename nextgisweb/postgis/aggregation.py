from nextgisweb.lib.registry import DictRegistry

from nextgisweb.feature_layer.aggregation import (
    PgMinMaxAggregation,
    PgUniqueValuesAggregation,
    ScalarAggregation,
    pg_batch_scalars,
)

postgis_aggregations = DictRegistry()


@postgis_aggregations.register
class MinMaxAggregation(PgMinMaxAggregation):
    pass


@postgis_aggregations.register
class UniqueValuesAggregation(PgUniqueValuesAggregation):
    pass


def aggregate(feature_query, specs):
    """Execute aggregations using the feature query's table and WHERE context."""
    _, col_map, where = feature_query.build_query_context()
    resource = feature_query.layer

    scalar_specs = []
    other_specs = []
    for idx, identity, spec in specs:
        impl = postgis_aggregations[identity](resource)
        if isinstance(impl, ScalarAggregation):
            scalar_specs.append((idx, impl, spec))
        else:
            other_specs.append((idx, impl, spec))

    with resource.connection.get_connection() as conn:
        results = {}
        if scalar_specs:
            results.update(pg_batch_scalars(col_map, where, scalar_specs, conn.execute))
        for idx, impl, spec in other_specs:
            results[idx] = impl.execute_aggregate(col_map, where, spec, conn.execute)
    return results
