import os

import psycopg
from pgvector.psycopg import register_vector

DB_PARAMS = {
    "dbname": os.environ.get("POSTGRES_DB", "synthesize_db"),
    "user": os.environ.get("POSTGRES_USER", "synthesize_admin"),
    "password": os.environ.get("POSTGRES_PASSWORD", ""),
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": os.environ.get("DB_PORT", "5432"),
}

def get_connection():
    """Establishes and returns a connection to the PostgreSQL database."""
    # Connect to the database
    conn = psycopg.connect(**DB_PARAMS)
    
    # CRITICAL FOR RAG: This tells the connection how to read/write pgvector data
    register_vector(conn)
    
    return conn