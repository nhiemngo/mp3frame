const MPEG_VERSION_1 = 0b11;
const LAYER_3 = 0b01;

const BITRATE_TABLE: Record<number, number> = {
  0b0001: 32000,
  0b0010: 40000,
  0b0011: 48000,
  0b0100: 56000,
  0b0101: 64000,
  0b0110: 80000,
  0b0111: 96000,
  0b1000: 112000,
  0b1001: 128000,
  0b1010: 160000,
  0b1011: 192000,
  0b1100: 224000,
  0b1101: 256000,
  0b1110: 320000,
};

const SAMPLE_RATE_TABLE: Record<number, number> = {
  0b00: 44100,
  0b01: 48000,
  0b10: 32000,
};

interface FrameHeader {
  bitrate: number;
  sampleRate: number;
  padding: boolean;
  frameSize: number;
}

function skipId3v2Tag(buffer: Buffer, offset: number): number {
  if (
    offset + 10 <= buffer.length &&
    buffer[offset] === 0x49 && // 'I'
    buffer[offset + 1] === 0x44 && // 'D'
    buffer[offset + 2] === 0x33 // '3'
  ) {
    const size =
      ((buffer[offset + 6] & 0x7f) << 21) |
      ((buffer[offset + 7] & 0x7f) << 14) |
      ((buffer[offset + 8] & 0x7f) << 7) |
      (buffer[offset + 9] & 0x7f);
    return offset + 10 + size;
  }
  return offset;
}

function parseFrameHeader(
  buffer: Buffer,
  offset: number,
): FrameHeader | null {
  if (offset + 4 > buffer.length) return null;

  const header = buffer.readUInt32BE(offset);

  const syncWord = (header >> 21) & 0x7ff;
  if (syncWord !== 0x7ff) return null;

  const version = (header >> 19) & 0x03;
  if (version !== MPEG_VERSION_1) return null;

  const layer = (header >> 17) & 0x03;
  if (layer !== LAYER_3) return null;

  const bitrateIndex = (header >> 12) & 0x0f;
  const bitrate = BITRATE_TABLE[bitrateIndex];
  if (!bitrate) return null;

  const sampleRateIndex = (header >> 10) & 0x03;
  const sampleRate = SAMPLE_RATE_TABLE[sampleRateIndex];
  if (!sampleRate) return null;

  const padding = ((header >> 9) & 0x01) === 1;

  // MPEG1 Layer 3: frameSize = 144 * bitrate / sampleRate + padding
  const frameSize =
    Math.floor((144 * bitrate) / sampleRate) + (padding ? 1 : 0);

  return { bitrate, sampleRate, padding, frameSize };
}

export function countFrames(buffer: Buffer): number {
  let offset = skipId3v2Tag(buffer, 0);
  let frameCount = 0;

  while (offset < buffer.length) {
    const header = parseFrameHeader(buffer, offset);

    if (header) {
      frameCount++;
      offset += header.frameSize;
    } else {
      offset++;
    }
  }

  return frameCount;
}
