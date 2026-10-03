/** Incremental SSE decoder; does not assume network chunks end on event boundaries. */
export class SseDecoder {
  private buffer = '';
  push(chunk: string): { event: string; data: string }[] {
    this.buffer += chunk;
    const frames: { event: string; data: string }[] = [];
    while (true) {
      const separator = /\r?\n\r?\n/.exec(this.buffer);
      if (!separator || separator.index === undefined) break;
      const frame = this.buffer.slice(0, separator.index);
      this.buffer = this.buffer.slice(separator.index + separator[0].length);
      let event = 'message'; const data: string[] = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) frames.push({ event, data: data.join('\n') });
    }
    return frames;
  }
}
