FROM python:3.10-slim

# Install build dependencies for compiling Python extensions (e.g. pyswisseph)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install dependencies
COPY backend/requirements.txt ./backend_requirements.txt
RUN pip install --no-cache-dir -r backend_requirements.txt

COPY agent/requirements.txt ./agent_requirements.txt
RUN pip install --no-cache-dir -r agent_requirements.txt

# Copy source code
COPY backend/ ./backend/
COPY agent/ ./agent/

# Copy start script
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Expose Hugging Face Space default port
EXPOSE 7860

CMD ["./start.sh"]
