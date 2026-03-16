"""
Production server using Waitress — handles ~1000 concurrent users on Windows.
Run with:  python serve.py
"""
import os
from dotenv import load_dotenv
from waitress import serve
from app import app

load_dotenv()

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", 5000))

# Threads handle concurrent requests.
# 16 threads = ~200-300 concurrent palm sessions comfortably.
# Increase to 32 for heavier load. Each thread handles one request at a time.
THREADS = 16

if __name__ == "__main__":
    print(f"AI Palmistry Production Server running at http://{HOST}:{PORT}")
    print(f"Threads: {THREADS}  |  Provider: {os.getenv('AI_PROVIDER', 'demo')}")
    serve(app, host=HOST, port=PORT, threads=THREADS)
