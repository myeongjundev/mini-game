import { Buffer } from 'node:buffer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { stdout } from 'node:process'

const rate = 22050
const seconds = 30
const samples = rate * seconds
const mix = new Float64Array(samples)
const output = resolve('public/audio/soc-shift-incident-escalation-loop.wav')
const beat = 0.5 // 120 BPM: five bars per ten-second threat tier.

const midiHz = (midi) => 440 * 2 ** ((midi - 69) / 12)
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

function oscillator(type, phase) {
  const position = phase / (Math.PI * 2)
  const wrapped = position - Math.floor(position)
  if (type === 'pulse') return wrapped < 0.22 ? 1 : -1
  if (type === 'triangle') return 1 - 4 * Math.abs(wrapped - 0.5)
  return Math.sin(phase)
}

function tone({ at, length, midi, level, type = 'sine', attack = 0.01, release = 0.08, bend = 0 }) {
  const first = Math.max(0, Math.floor(at * rate))
  const last = Math.min(samples, Math.ceil((at + length) * rate))
  const frequency = midiHz(midi)
  for (let index = first; index < last; index += 1) {
    const local = index / rate - at
    const envelope = Math.min(clamp(local / attack, 0, 1), clamp((length - local) / release, 0, 1))
    const bentFrequency = frequency * (1 + bend * local / Math.max(length, 0.001))
    mix[index] += oscillator(type, Math.PI * 2 * bentFrequency * local) * level * envelope
  }
}

let noiseSeed = 0x0317c0de
function noise() {
  noiseSeed = (Math.imul(noiseSeed, 1103515245) + 12345) >>> 0
  return noiseSeed / 0x7fffffff - 1
}

function dataTick(at, level) {
  const length = 0.024
  const first = Math.floor(at * rate)
  const last = Math.min(samples, Math.ceil((at + length) * rate))
  let previous = 0
  for (let index = first; index < last; index += 1) {
    const local = index / rate - at
    const value = noise()
    const edge = value - previous * 0.92
    previous = value
    mix[index] += edge * level * Math.exp(-local * 115)
  }
}

function subPulse(at, level) {
  tone({ at, length: 0.19, midi: 28, level, type: 'sine', attack: 0.004, release: 0.13, bend: -0.16 })
}

// Continuous equipment hum. The absolute phase makes the 30-second boundary continuous.
for (let index = 0; index < samples; index += 1) {
  const time = index / rate
  const air = Math.sin(Math.PI * 2 * 55 * time) * 0.015
  const monitor = Math.sin(Math.PI * 2 * 110 * time) * 0.006
  const modulation = 0.72 + Math.sin(Math.PI * 2 * 0.2 * time) * 0.12
  mix[index] += (air + monitor) * modulation
}

// Tier 1, 0–10s: sparse monitoring pulse with large spaces for reading.
for (let at = 0; at < 10; at += beat) {
  if (Math.round(at / beat) % 2 === 0) subPulse(at, 0.085)
  if (Math.round(at / beat) % 4 === 3) dataTick(at + 0.25, 0.018)
}
for (const at of [1.5, 5.5, 9.5]) {
  tone({ at, length: 0.12, midi: 76, level: 0.022, type: 'sine', release: 0.07 })
}

// Tier 2, 10–20s: suspicious data activity, deliberately not a singable melody.
const scanNotes = [52, 58, 55, 61] // E, Bb, G, C#: uneasy tritone language.
for (let step = 0; step < 40; step += 1) {
  const at = 10 + step * 0.25
  if (step % 2 === 0) subPulse(at, step % 8 === 0 ? 0.11 : 0.07)
  dataTick(at + 0.012, step % 4 === 3 ? 0.026 : 0.014)
  if (step % 4 === 1) {
    tone({ at, length: 0.09, midi: scanNotes[(step >> 2) % scanNotes.length] + 12, level: 0.019, type: 'pulse', attack: 0.002, release: 0.045 })
  }
}

// Tier 3, 20–30s: critical pressure, with alternating warning intervals and no huge drums.
for (let step = 0; step < 40; step += 1) {
  const at = 20 + step * 0.25
  if (step % 2 === 0) subPulse(at, step % 8 === 0 ? 0.145 : 0.09)
  dataTick(at + 0.008, step % 2 === 0 ? 0.024 : 0.016)
  if (step % 4 === 0) {
    tone({ at: at + 0.04, length: 0.15, midi: 64, level: 0.024, type: 'triangle', release: 0.09 })
    tone({ at: at + 0.04, length: 0.15, midi: 70, level: 0.018, type: 'triangle', release: 0.09 })
  }
  if (step % 8 === 7) {
    tone({ at: at + 0.12, length: 0.07, midi: 88, level: 0.02, type: 'sine', release: 0.035 })
  }
}

let peak = 0
for (const value of mix) peak = Math.max(peak, Math.abs(value))
const scale = peak === 0 ? 1 : 0.44 / peak
const wav = Buffer.alloc(44 + samples * 2)
wav.write('RIFF', 0)
wav.writeUInt32LE(wav.length - 8, 4)
wav.write('WAVE', 8)
wav.write('fmt ', 12)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(rate, 24)
wav.writeUInt32LE(rate * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(samples * 2, 40)

let sumSquares = 0
for (let index = 0; index < samples; index += 1) {
  const value = clamp(mix[index] * scale, -1, 1)
  sumSquares += value * value
  wav.writeInt16LE(Math.round(value * 32767), 44 + index * 2)
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, wav)
stdout.write(`${JSON.stringify({
  output,
  seconds,
  bpm: 120,
  sampleRate: rate,
  channels: 1,
  peak: 0.44,
  rms: Number(Math.sqrt(sumSquares / samples).toFixed(4)),
  bytes: wav.length,
}, null, 2)}\n`)
