const WebSocket = require('ws');
const { spawn } = require('child_process');

// CONFIGURATION
const STREAM_PORT = 9999;
const RTSP_URL = 'rtsp://10.14.62.176:8080/h264.sdp'; // As requested by user

const wss = new WebSocket.Server({ port: STREAM_PORT });

console.log(`\n🚀 RTSP Bridge Active on ws://localhost:${STREAM_PORT}`);
console.log(`📺 Source: ${RTSP_URL}`);
console.log(`💡 Run your React app and connect to ws://localhost:${STREAM_PORT}\n`);

wss.on('connection', (ws) => {
    console.log('[BRIDGE] Client Connected. Initializing FFMPEG...');

    // FFMPEG command to transcode RTSP to MPEG1-TS (compatible with JSMpeg)
    const ffmpeg = spawn('ffmpeg', [
        '-i', RTSP_URL,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-s', '640x480', // Scale for performance
        '-b:v', '800k',   // Bitrate
        '-r', '30',      // Framerate
        '-bf', '0',      // No B-frames for low latency
        '-'              // Output to stdout
    ]);

    ffmpeg.stdout.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        // Log errors but don't spam if it's just progress
        if (data.toString().includes('Error')) {
            console.error('[FFMPEG ERROR]', data.toString());
        }
    });

    ws.on('close', () => {
        console.log('[BRIDGE] Client Disconnected. Killing FFMPEG.');
        ffmpeg.kill();
    });
});
