import { countFrames } from "../mp3-parser";

function buildFrameHeader(
  bitrate: number,
  sampleRate: number,
  padding: boolean,
): Buffer {
  const bitrateMap: Record<number, number> = {
    32000: 0b0001,
    40000: 0b0010,
    48000: 0b0011,
    56000: 0b0100,
    64000: 0b0101,
    80000: 0b0110,
    96000: 0b0111,
    112000: 0b1000,
    128000: 0b1001,
    160000: 0b1010,
    192000: 0b1011,
    224000: 0b1100,
    256000: 0b1101,
    320000: 0b1110,
  };

  const sampleRateMap: Record<number, number> = {
    44100: 0b00,
    48000: 0b01,
    32000: 0b10,
  };

  let header = 0;
  header |= 0x7ff << 21;
  header |= 0b11 << 19;
  header |= 0b01 << 17;
  header |= 1 << 16;
  header |= bitrateMap[bitrate] << 12;
  header |= sampleRateMap[sampleRate] << 10;
  header |= (padding ? 1 : 0) << 9;

  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(header >>> 0, 0);
  return buf;
}

function buildFrame(
  bitrate: number,
  sampleRate: number,
  padding: boolean,
): Buffer {
  const header = buildFrameHeader(bitrate, sampleRate, padding);
  const frameSize =
    Math.floor((144 * bitrate) / sampleRate) + (padding ? 1 : 0);
  const body = Buffer.alloc(frameSize - 4);
  return Buffer.concat([header, body]);
}

describe("countFrames", () => {
  it("returns 0 for an empty buffer", () => {
    expect(countFrames(Buffer.alloc(0))).toBe(0);
  });

  it("returns 0 for random data with no valid frames", () => {
    const noise = Buffer.alloc(1024, 0x42);
    expect(countFrames(noise)).toBe(0);
  });

  it("counts a single frame", () => {
    const frame = buildFrame(128000, 44100, false);
    expect(countFrames(frame)).toBe(1);
  });

  it("counts multiple consecutive frames", () => {
    const frames = Buffer.concat([
      buildFrame(128000, 44100, false),
      buildFrame(128000, 44100, false),
      buildFrame(128000, 44100, false),
    ]);
    expect(countFrames(frames)).toBe(3);
  });

  it("counts frames with varying bitrates (VBR)", () => {
    const frames = Buffer.concat([
      buildFrame(128000, 44100, false),
      buildFrame(192000, 44100, false),
      buildFrame(320000, 44100, false),
    ]);
    expect(countFrames(frames)).toBe(3);
  });

  it("handles frames with padding", () => {
    const frames = Buffer.concat([
      buildFrame(128000, 44100, true),
      buildFrame(128000, 44100, false),
    ]);
    expect(countFrames(frames)).toBe(2);
  });

  it("skips ID3v2 tags at the start", () => {
    const id3Header = Buffer.alloc(10);
    id3Header.write("ID3", 0);
    id3Header[3] = 4; // version
    id3Header[4] = 0;
    id3Header[5] = 0; // flags

    const tagSize = 128;
    id3Header[6] = (tagSize >> 21) & 0x7f;
    id3Header[7] = (tagSize >> 14) & 0x7f;
    id3Header[8] = (tagSize >> 7) & 0x7f;
    id3Header[9] = tagSize & 0x7f;

    const tagBody = Buffer.alloc(tagSize);
    const frame = buildFrame(128000, 44100, false);

    const file = Buffer.concat([id3Header, tagBody, frame]);
    expect(countFrames(file)).toBe(1);
  });

  it("handles different sample rates", () => {
    const frames = Buffer.concat([
      buildFrame(128000, 48000, false),
      buildFrame(128000, 32000, false),
    ]);
    expect(countFrames(frames)).toBe(2);
  });
});
