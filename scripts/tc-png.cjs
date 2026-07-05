#!/usr/bin/env node
/** Minimal RGB/RGBA PNG writer — no native deps */
const zlib = require('zlib');

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filePath, width, height, rgba, fs) {
    const rowSize = width * 4 + 1;
    const raw = Buffer.alloc(rowSize * height);
    for (let y = 0; y < height; y += 1) {
        const row = y * rowSize;
        raw[row] = 0;
        rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const idat = zlib.deflateSync(raw, { level: 9 });
    const png = Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr),
        chunk('IDAT', idat),
        chunk('IEND', Buffer.alloc(0)),
    ]);
    fs.writeFileSync(filePath, png);
}

function fillRgba(w, h, fn) {
    const buf = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            const i = (y * w + x) * 4;
            const [r, g, b, a] = fn(x, y, w, h);
            buf[i] = r;
            buf[i + 1] = g;
            buf[i + 2] = b;
            buf[i + 3] = a ?? 255;
        }
    }
    return buf;
}

function scaleRgba(src, sw, sh, tw, th) {
    const buf = Buffer.alloc(tw * th * 4);
    for (let y = 0; y < th; y += 1) {
        for (let x = 0; x < tw; x += 1) {
            const sx = Math.min(sw - 1, Math.floor((x / tw) * sw));
            const sy = Math.min(sh - 1, Math.floor((y / th) * sh));
            const si = (sy * sw + sx) * 4;
            const di = (y * tw + x) * 4;
            buf[di] = src[si];
            buf[di + 1] = src[si + 1];
            buf[di + 2] = src[si + 2];
            buf[di + 3] = src[si + 3];
        }
    }
    return buf;
}

module.exports = { writePng, fillRgba, scaleRgba };