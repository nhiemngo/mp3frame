# mp3frame

API endpoint that accepts an MP3 file upload and returns the number of MPEG Version 1 Layer 3 frames in the file.

## Setup

```bash
npm install
```

## Usage

Start the development server:

```bash
npm run dev
```

Upload an MP3 file:

```bash
curl -F "file=@sample.mp3" http://localhost:3000/file-upload
```

Response:

```json
{
  "frameCount": 8424
}
```

## Scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `npm run dev`    | Start dev server (ts-node)   |
| `npm run build`  | Compile TypeScript           |
| `npm start`      | Run compiled output          |
| `npm test`       | Run tests                    |
| `npm run lint`   | Lint with ESLint             |
| `npm run format` | Format with Prettier         |

## How it works

The parser reads the raw MP3 binary data and walks through it frame by frame:

1. **Skip ID3v2 tags** — If the file begins with an ID3v2 header, the parser reads the syncsafe size field and jumps past the tag.
2. **Find frame headers** — Each MPEG audio frame starts with an 11-bit sync word (all 1s). The parser validates the header is MPEG Version 1, Layer 3.
3. **Calculate frame size** — Using the bitrate and sample rate from the header: `frameSize = floor(144 * bitrate / sampleRate) + padding`.
4. **Advance** — Jump forward by the frame size to the next frame header and repeat until the end of the file.
