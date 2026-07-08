-- PostgreSQL schema for CustomerChurnDB
-- Run this script inside an existing database.
-- If the database does not exist yet, create it first using a separate command:
--   CREATE DATABASE customerchurndb;
-- Then connect to the database and run this file.

CREATE TABLE IF NOT EXISTS customers (
    id serial PRIMARY KEY,
    customer_id integer NOT NULL,
    surname varchar(100),
    credit_score integer,
    geography varchar(50),
    gender varchar(10),
    age integer,
    tenure integer,
    balance numeric(15,2),
    num_of_products integer,
    has_cr_card boolean,
    is_active_member boolean,
    estimated_salary numeric(15,2),
    exited boolean,
    complain boolean,
    satisfaction_score integer,
    card_type varchar(50),
    point_earned integer,
    cluster_label varchar(50),
    created_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS predictions (
    id serial PRIMARY KEY,
    session_id varchar(100),
    customer_id integer,
    surname varchar(100),
    geography varchar(50),
    prediction_result varchar(50),
    probability numeric(5,4),
    input_data jsonb,   
    created_at timestamp without time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_customer_id ON predictions(customer_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
