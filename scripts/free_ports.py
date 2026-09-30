import socket
import subprocess
import os
import sys

def get_pids_for_port(port):
    pids = set()
    try:
        out = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode('utf-8', errors='ignore')
        for line in out.strip().splitlines():
            parts = line.split()
            if len(parts) >= 5 and f":{port}" in parts[1]:
                state = parts[3]
                pid = int(parts[4])
                if pid > 0 and (state == "LISTENING" or "LISTENING" in line):
                    pids.add(pid)
    except Exception:
        pass
    return pids

def kill_pid(pid):
    try:
        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
        print(f"Terminated process PID {pid}")
    except Exception as e:
        print(f"Error terminating PID {pid}: {e}")

ports = [8000, 8001, 8002]
print("--- Checking and freeing ports 8000, 8001, 8002 ---")
for p in ports:
    pids = get_pids_for_port(p)
    if pids:
        print(f"Port {p} is currently occupied by PID(s): {pids}")
        for pid in pids:
            kill_pid(pid)
    else:
        print(f"Port {p} has no listening processes.")

import time
time.sleep(1)

print("\n--- Port Status Verification ---")
for p in ports:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('0.0.0.0', p))
        print(f"Port {p}: FREE (Successfully bound 0.0.0.0:{p})")
    except Exception as e:
        print(f"Port {p}: OCCUPIED ({e})")
    finally:
        s.close()
