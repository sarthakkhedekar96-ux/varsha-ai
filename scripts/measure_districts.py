import urllib.request
import time

t0 = time.time()
try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/api/districts', timeout=60)
    dt = time.time() - t0
    print(f"Success in {dt:.2f}s! Received {len(req.read())} bytes")
except Exception as e:
    print(f"Error: {e} after {time.time() - t0:.2f}s")
