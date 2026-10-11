// Zero-dependency streaming ZIP writer (STORE method, no compression).
// PDFs/JPEGs/PNGs/HEICs are already compressed, so STORE costs almost nothing in size
// and keeps CPU + memory flat: one file is streamed at a time, never buffered whole.
// Limits (no Zip64): < 65,535 entries and < 4 GiB total archive size.

export type ZipEntry = {
  /** Path inside the archive, e.g. "passport/scan.pdf". Use "/" separators. */
  name: string;
  lastModified?: Date;
  /** Called lazily, only when the zip reaches this entry. */
  open: () => Promise<ReadableStream<Uint8Array>>;
};

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Uint8Array, prev = 0): number {
  let c = ~prev;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function dosDateTime(d: Date) {
  const year = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

const FLAGS = 0x0808; // bit 3: sizes/CRC in data descriptor; bit 11: UTF-8 file names
const enc = new TextEncoder();

async function* zipChunks(entries: AsyncIterable<ZipEntry> | Iterable<ZipEntry>): AsyncGenerator<Uint8Array> {
  const central: Uint8Array[] = [];
  let offset = 0;
  let count = 0;

  for await (const entry of entries) {
    const name = enc.encode(entry.name);
    const { time, date } = dosDateTime(entry.lastModified ?? new Date());

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header signature
    lv.setUint16(4, 20, true); // version needed (2.0)
    lv.setUint16(6, FLAGS, true);
    lv.setUint16(8, 0, true); // method 0 = STORE
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    // 14..25: crc + sizes left 0, written in the data descriptor
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    yield local;

    let crc = 0;
    let size = 0;
    const reader = (await entry.open()).getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        crc = crc32(value, crc);
        size += value.length;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }

    const dd = new Uint8Array(16);
    const dv = new DataView(dd.buffer);
    dv.setUint32(0, 0x08074b50, true); // data descriptor signature
    dv.setUint32(4, crc, true);
    dv.setUint32(8, size, true);
    dv.setUint32(12, size, true);
    yield dd;

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory header signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, FLAGS, true);
    cv.setUint16(10, 0, true); // STORE
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true); // offset of local header
    cd.set(name, 46);
    central.push(cd);

    offset += local.length + size + dd.length;
    count++;
    if (offset > 0xffffffff || count > 0xffff) throw new Error("ZIP too large (no Zip64 support)");
  }

  let cdSize = 0;
  for (const cd of central) {
    cdSize += cd.length;
    yield cd;
  }
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory signature
  ev.setUint16(8, count, true);
  ev.setUint16(10, count, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  yield end;
}

/** Pull-based stream: the next blob is only fetched when the client has read the previous one. */
export function zipStream(entries: AsyncIterable<ZipEntry> | Iterable<ZipEntry>): ReadableStream<Uint8Array> {
  const gen = zipChunks(entries);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await gen.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await gen.return(undefined);
    },
  });
}
