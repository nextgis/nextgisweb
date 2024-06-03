/*** {
    "revision": "42550420", "parents": ["420c3c0b"],
    "date": "2024-01-26T11:00:53",
    "message": "Transactions"
} ***/

CREATE TABLE feature_layer_transaction (
    id integer NOT NULL ,
    resource_id integer NOT NULL,
    epoch integer,
    user_id integer NOT NULL,
    started timestamp without time zone NOT NULL,
    committed timestamp without time zone,
    PRIMARY KEY (id),
    CONSTRAINT feature_layer_transaction_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES resource(id) ON DELETE CASCADE,
    CONSTRAINT feature_layer_transaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_principal(id) ON DELETE CASCADE
);

COMMENT ON TABLE feature_layer_transaction IS 'feature_layer';

CREATE SEQUENCE feature_layer_transaction_id_seq OWNED BY feature_layer_transaction.id;
ALTER TABLE feature_layer_transaction ALTER COLUMN id SET DEFAULT nextval('feature_layer_transaction_id_seq');

CREATE TABLE feature_layer_transaction_operation (
    transaction_id integer NOT NULL,
    seqnum integer NOT NULL,
    payload jsonb NOT NULL,
    params jsonb,
    error jsonb,
    PRIMARY KEY (transaction_id, seqnum),
    CONSTRAINT feature_layer_transaction_operation_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES feature_layer_transaction(id) ON DELETE CASCADE
);

COMMENT ON TABLE feature_layer_transaction_operation IS 'feature_layer';

CREATE TABLE feature_layer_transaction_result (
    transaction_id integer NOT NULL,
    seqnum integer NOT NULL,
    value jsonb NOT NULL,
    PRIMARY KEY (transaction_id, seqnum),
    CONSTRAINT feature_layer_transaction_result_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES feature_layer_transaction(id) ON DELETE CASCADE
);

COMMENT ON TABLE feature_layer_transaction_result IS 'feature_layer';

