import * as fs from "node:fs";
const IN = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

function run(p: Buffer, inp: Buffer) {
  const s: number[] = [], c: number[] = [], m = new Int32Array(256), o: number[] = [];
  let pc = 0, n = 0, ip = 0;
  const end = (e: number) => ({ out: Buffer.from(o), exit: e });
  const push = (v: number) => { if (s.length > 255) return false; s.push(v | 0); return true; };
  const need = (k: number) => s.length >= k;
  for (;;) {
    if (n >= 1000000) return end(10);
    if (pc < 0 || pc >= p.length) return end(9);
    const op = p[pc];
    const ok = op <= 7 || (op >= 0x10 && op <= 0x1e) || (op >= 0x20 && op <= 0x22) ||
      (op >= 0x30 && op <= 0x34) || (op >= 0x40 && op <= 0x41) || (op >= 0x50 && op <= 0x53);
    if (!ok) return end(5);
    let npc = pc + 1, imm = 0, il = 0;
    if (op === 1) il = 1;
    else if (op === 2) il = 4;
    else if (op >= 0x30 && op <= 0x33) il = 2;
    if (il) {
      if (pc + il >= p.length) return end(9);
      npc = pc + 1 + il;
      imm = il === 1 ? (p[pc + 1] << 24) >> 24 : il === 4 ? p.readInt32LE(pc + 1)
        : op === 0x33 ? p.readUInt16LE(pc + 1) : p.readInt16LE(pc + 1);
    }
    let a = 0, b = 0;
    switch (op) {
      case 0x00: return end(0);
      case 0x01: case 0x02: if (!push(imm)) return end(3); break;
      case 0x03: if (!need(1)) return end(2); s.pop(); break;
      case 0x04: if (!need(1)) return end(2); if (!push(s[s.length - 1])) return end(3); break;
      case 0x05:
        if (!need(2)) return end(2);
        a = s[s.length - 1]; s[s.length - 1] = s[s.length - 2]; s[s.length - 2] = a; break;
      case 0x06: if (!need(2)) return end(2); if (!push(s[s.length - 2])) return end(3); break;
      case 0x07:
        if (!need(3)) return end(2);
        a = s[s.length - 3]; b = s[s.length - 2];
        s[s.length - 3] = b; s[s.length - 2] = s[s.length - 1]; s[s.length - 1] = a; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
      case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
      case 0x1e: case 0x20: case 0x21: case 0x22: {
        if (!need(2)) return end(2);
        b = s.pop() as number; a = s.pop() as number;
        if (op === 0x10) { if (!push(a + b)) return end(3); }
        else if (op === 0x11) { if (!push(a - b)) return end(3); }
        else if (op === 0x12) { if (!push(Math.imul(a, b))) return end(3); }
        else if (op === 0x13) {
          if (b === 0) return end(4);
          if (!push(a === -2147483648 && b === -1 ? -2147483648 : (a / b) | 0)) return end(3);
        } else if (op === 0x14) {
          if (b === 0) return end(4);
          if (!push(b === -1 ? 0 : a % b)) return end(3);
        } else if (op === 0x15) {
          if (b === 0) return end(4);
          if (!push(Math.trunc((a >>> 0) / (b >>> 0)))) return end(3);
        } else if (op === 0x16) {
          if (b === 0) return end(4);
          if (!push((a >>> 0) % (b >>> 0))) return end(3);
        } else if (op === 0x18) { if (!push(a & b)) return end(3); }
        else if (op === 0x19) { if (!push(a | b)) return end(3); }
        else if (op === 0x1a) { if (!push(a ^ b)) return end(3); }
        else if (op === 0x1c) { if (!push(a << (b & 31))) return end(3); }
        else if (op === 0x1d) { if (!push(a >> (b & 31))) return end(3); }
        else if (op === 0x1e) { if (!push(a >>> (b & 31))) return end(3); }
        else if (op === 0x20) { if (!push(a === b ? 1 : 0)) return end(3); }
        else if (op === 0x21) { if (!push(a < b ? 1 : 0)) return end(3); }
        else if (op === 0x22) { if (!push((a >>> 0) < (b >>> 0) ? 1 : 0)) return end(3); }
        break;
      }
      case 0x17: if (!need(1)) return end(2); s[s.length - 1] = (-s[s.length - 1]) | 0; break;
      case 0x1b: if (!need(1)) return end(2); s[s.length - 1] = ~s[s.length - 1]; break;
      case 0x30: pc = npc + imm; n++; continue;
      case 0x31: if (!need(1)) return end(2); pc = (s.pop() as number) === 0 ? npc + imm : npc; n++; continue;
      case 0x32: if (!need(1)) return end(2); pc = (s.pop() as number) !== 0 ? npc + imm : npc; n++; continue;
      case 0x33: if (c.length >= 64) return end(7); c.push(npc); pc = imm; n++; continue;
      case 0x34: if (c.length === 0) return end(8); pc = c.pop() as number; n++; continue;
      case 0x40:
        if (!need(1)) return end(2);
        a = s.pop() as number;
        if (a < 0 || a > 255) return end(6);
        if (!push(m[a])) return end(3);
        break;
      case 0x41:
        if (!need(2)) return end(2);
        a = s.pop() as number; b = s.pop() as number;
        if (a < 0 || a > 255) return end(6);
        m[a] = b; break;
      case 0x50: {
        if (!need(1)) return end(2);
        const t = String(s.pop() as number);
        if (o.length + t.length > 65536) return end(11);
        for (let i = 0; i < t.length; i++) o.push(t.charCodeAt(i));
        break;
      }
      case 0x51:
        if (!need(1)) return end(2);
        if (o.length + 1 > 65536) return end(11);
        o.push((s.pop() as number) & 255); break;
      case 0x52: if (!push(ip < inp.length ? inp[ip++] : -1)) return end(3); break;
      case 0x53: if (!need(1)) return end(2); return end((s.pop() as number) & 255);
    }
    pc = npc;
    n++;
  }
}

for (let i = 1; i <= 40; i++) {
  const id = "i" + String(i).padStart(3, "0");
  const prog = fs.readFileSync(IN + "/" + id + "/program.bin");
  const inp = fs.readFileSync(IN + "/" + id + "/input.bin");
  const r = run(prog, inp);
  const od = OUT + "/" + id;
  fs.mkdirSync(od, { recursive: true });
  fs.writeFileSync(od + "/stdout.bin", r.out);
  fs.writeFileSync(od + "/exit.txt", String(r.exit) + "\n");
}
