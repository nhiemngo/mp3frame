import request from "supertest";
import app from "../app";

function buildFrame(
  bitrate: number,
  sampleRate: number,
  padding: boolean,
): Buffer {
  const bitrateMap: Record<number, number> = {
    128000: 0b1001,
    192000: 0b1011,
  };
  const sampleRateMap: Record<number, number> = { 44100: 0b00 };

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

  const frameSize =
    Math.floor((144 * bitrate) / sampleRate) + (padding ? 1 : 0);
  return Buffer.concat([buf, Buffer.alloc(frameSize - 4)]);
}

describe("POST /file-upload", () => {
  it("returns frame count for a valid MP3", async () => {
    const mp3 = Buffer.concat([
      buildFrame(128000, 44100, false),
      buildFrame(128000, 44100, false),
    ]);

    const res = await request(app)
      .post("/file-upload")
      .attach("file", mp3, "test.mp3");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({ frameCount: 2 });
  });

  it("returns 400 when no file is uploaded", async () => {
    const res = await request(app).post("/file-upload");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "No file provided" });
  });

  it("rejects non-MP3 files", async () => {
    const res = await request(app)
      .post("/file-upload")
      .attach("file", Buffer.from("not an mp3"), {
        filename: "test.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
