import urllib.request
import urllib.error
import time

try:
    t0 = time.time()
    req = urllib.request.urlopen('http://127.0.0.1:8000/api/districts', timeout=15)
    dt = time.time() - t0
    print(f"Status: {req.getcode()}, Time: {dt:.2f}s, Read: {len(req.read())} bytes")
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Exception: {type(e)} - {e}")
