FROM python:3.11-slim

WORKDIR /app

# Install native dependencies required for some python packages like faiss-cpu or numpy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure data directory exists
RUN mkdir -p data

EXPOSE 8000

CMD ["python", "server.py"]
