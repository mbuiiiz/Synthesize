import psycopg
from pgvector.psycopg import register_vector

DB_PARAMS = {
    "dbname": "synthesize_db",
    "user": "synthesize_admin",
    "password": "securepassword123",
    "host": "localhost", # Docker exposes to local machine
    "port": "5432"
}

def get_connection():
    """Establishes and returns a connection to the PostgreSQL database."""
    # Connect to the database
    conn = psycopg.connect(**DB_PARAMS)
    
    # CRITICAL FOR RAG: This tells the connection how to read/write pgvector data
    register_vector(conn)
    
    return conn