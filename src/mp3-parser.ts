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

function parseFrameSize(buffer: Buffer, offset: number): number | null {
  if (offset + 4 > buffer.length) return null;

  const header = buffer.readUInt32BE(offset);

  if (((header >> 21) & 0x7ff) !== 0x7ff) return null; // sync word
  if (((header >> 19) & 0x03) !== 0b11) return null; // MPEG version 1
  if (((header >> 17) & 0x03) !== 0b01) return null; // Layer 3

  const bitrate = BITRATE_TABLE[(header >> 12) & 0x0f];
  const sampleRate = SAMPLE_RATE_TABLE[(header >> 10) & 0x03];
  if (!bitrate || !sampleRate) return null;

  const padding = (header >> 9) & 0x01;
  return Math.floor((144 * bitrate) / sampleRate) + padding;
}

export function countFrames(buffer: Buffer): number {
  let offset = 0;

  // Skip ID3v2 tag if present
  if (
    buffer.length >= 10 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    offset =
      10 +
      (((buffer[6] & 0x7f) << 21) |
        ((buffer[7] & 0x7f) << 14) |
        ((buffer[8] & 0x7f) << 7) |
        (buffer[9] & 0x7f));
  }

  let frameCount = 0;
  while (offset < buffer.length) {
    const frameSize = parseFrameSize(buffer, offset);
    if (frameSize) {
      frameCount++;
      offset += frameSize;
    } else {
      offset++;
    }
  }

  return frameCount;
}
