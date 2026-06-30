# apps/backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY apps/backend /app/apps/backend

# Set PYTHONPATH so imports work correctly
ENV PYTHONPATH="/app:${PYTHONPATH}"

CMD ["python", "-m", "apps.backend.RAG.pipeline.main"]