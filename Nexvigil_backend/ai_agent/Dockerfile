# AI Agent Dockerfile

FROM python:3.9-slim

WORKDIR /app

# Install AI dependencies (Ultralytics requires some libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Agent Code
COPY . .

# Media folder should be mounted
RUN mkdir -p media

CMD ["python", "main.py"]
