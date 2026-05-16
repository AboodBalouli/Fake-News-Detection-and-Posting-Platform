FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV NLTK_DATA=/usr/local/nltk_data

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download required NLTK data so runtime doesn't need network access
RUN python -c "import os; import nltk; d=os.environ.get('NLTK_DATA','/usr/local/nltk_data');\
    nltk.download('punkt', download_dir=d, quiet=True);\
    [nltk.download(r, download_dir=d, quiet=True) for r in ['stopwords','wordnet','omw-1.4']]"

# Copy project
COPY . .

# Create upload directories
RUN mkdir -p uploads profile_pictures

# Entrypoint
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Create non-root user (with a real home dir for NLTK downloads)
RUN groupadd -r appuser && useradd -r -g appuser -m -d /home/appuser appuser
RUN chown -R appuser:appuser /app
ENV HOME=/home/appuser
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2).read()" || exit 1

# Run the application
CMD ["/app/entrypoint.sh"]