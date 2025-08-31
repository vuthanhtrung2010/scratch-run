import * as fs from 'fs';

type StopFn = (ch: number) => boolean;

interface KattioType {
  _buf: Buffer;
  _bufPos: number;
  _bufLen: number;
  _ensure(): void;
  _isws(ch: number): boolean;
  _islf(ch: number): boolean;
  _peekChar(): number;
  _skipWs(): void;
  _readUntil(stop: StopFn): string;
  nextToken(): string;
  nextLine(): string;
}

const Kattio: KattioType = {
  _buf: Buffer.alloc(1 << 20),
  _bufPos: 0,
  _bufLen: 0,
  _ensure: function (): void {
    if (this._bufPos === this._bufLen) {
      this._bufPos = 0;
      try {
        this._bufLen = fs.readSync(0, this._buf, 0, this._buf.length, null);
      } catch (error: any) {
        // Ref: https://github.com/nodejs/node/issues/35997
        if (error.code === 'EOF') {
          this._bufLen = 0;
          return;
        }
        throw error;
      }
    }
  },

  _isws: function (ch: number): boolean {
    return ch === 32 || (9 <= ch && ch <= 13);
  },

  _islf: function (ch: number): boolean {
    return ch === 10 || ch === 13;
  },

  _peekChar: function (): number {
    this._ensure();
    return this._bufPos === this._bufLen ? 0 : (this._buf[this._bufPos] ?? 0);
  },

  _skipWs: function (): void {
    while (this._isws(this._peekChar())) this._bufPos++;
  },

  _readUntil: function (stop: StopFn): string {
    this._ensure();
    if (this._bufPos === this._bufLen) {
      throw new Error('End of file reached');
    }

    let start = this._bufPos;
    let before: Buffer | null = null;
    for (;;) {
      if (this._bufPos === this._bufLen) {
        // Hit the end; need to switch buffers. Thus, stash away all we have so far
        // into the 'before' buffer.
        const len = this._bufPos - start;
        const preLen = before ? before.length : 0;
        const nbuf = Buffer.alloc(len + preLen);
        if (before) before.copy(nbuf);
        this._buf.copy(nbuf, preLen, start, this._bufPos);
        before = nbuf;
        this._ensure();
        start = this._bufPos;
      }
      if (this._bufPos === this._bufLen || stop(this._buf[this._bufPos] ?? 0)) break;
      this._bufPos++;
    }
    if (!before) {
      return this._buf.toString('utf8', start, this._bufPos);
    }
    const after = this._buf.subarray(start, this._bufPos);
    const res = Buffer.alloc(before.length + after.length);
    before.copy(res, 0, 0, before.length);
    after.copy(res, before.length, 0, after.length);
    return res.toString('utf8');
  },

  nextToken: function (): string {
    this._skipWs();
    return this._readUntil(this._isws);
  },

  nextLine: function (): string {
    const line = this._readUntil(this._islf);
    if (this._peekChar() === 13) this._bufPos++;
    if (this._peekChar() === 10) this._bufPos++;
    return line;
  }
};

export default Kattio;
