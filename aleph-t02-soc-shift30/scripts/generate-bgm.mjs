import { Buffer } from 'node:buffer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { stdout } from 'node:process'

const sampleRate = 22050
const durationSeconds = 30
const totalSamples = sampleRate * durationSeconds
const mix = new Float64Array(totalSamples)
const bpm = 96
const beat = 60 / bpm
const eighth = beat / 2
const outputPath = resolve('public/audio/soc-shift-night-watch-loop.wav')

const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function wave(type, phase) {
  const cycle = phase / (Math.PI * 2)
  const wrapped = cycle - Math.floor(cycle)
  if (type === 'square') return wrapped < 0.5 ? 1 : -1
  if (type === 'triangle') return 1 - 4 * Math.abs(wrapped - 0.5)
  return Math.sin(phase)
}

function addTone({ start, length, midi, gain, type = 'triangle', attack = 0.008, release = 0.08 }) {
  const first = Math.max(0, Math.floor(start * sampleRate))
  const last = Math.min(totalSamples, Math.ceil((start + length) * sampleRate))
  const frequency = midiToHz(midi)

  for (let index = first; index < last; index += 1) {
    const local = index / sampleRate - start
    const fadeIn = clamp(local / attack, 0, 1)
    const fadeOut = clamp((length - local) / release, 0, 1)
    const envelope = Math.min(fadeIn, fadeOut)
    const phase = Math.PI * 2 * frequency * local
    mix[index] += wave(type, phase) * gain * envelope
  }
}

function addKick(start, gain = 0.16) {
  const length = 0.16
  const first = Math.floor(start * sampleRate)
  const last = Math.min(totalSamples, Math.ceil((start + length) * sampleRate))
  for (let index = first; index < last; index += 1) {
    const local = index / sampleRate - start
    const envelope = Math.exp(-local * 28)
    const frequency = 92 - local * 260
    mix[index] += Math.sin(Math.PI * 2 * frequency * local) * gain * envelope
  }
}

let noiseState = 0x534f4330
function randomSigned() {
  noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0
  return (noiseState / 0xffffffff) * 2 - 1
}

function addHat(start, gain = 0.018) {
  const length = 0.035
  const first = Math.floor(start * sampleRate)
  const last = Math.min(totalSamples, Math.ceil((start + length) * sampleRate))
  let previous = 0
  for (let index = first; index < last; index += 1) {
    const local = index / sampleRate - start
    const noise = randomSigned()
    const highPassed = noise - previous * 0.85
    previous = noise
    mix[index] += highPassed * gain * Math.exp(-local * 85)
  }
}

// Twelve 4/4 bars at 96 BPM are exactly 30 seconds.
const roots = [38, 34, 36, 33] // D2, Bb1, C2, A1
const chords = [
  [50, 53, 57, 60], // Dm7
  [46, 50, 53, 57], // Bbmaj7
  [48, 52, 55, 60], // C
  [45, 49, 52, 55], // Am7
]

for (let bar = 0; bar < 12; bar += 1) {
  const barStart = bar * beat * 4
  const progression = bar % 4
  const root = roots[progression]
  const chord = chords[progression]

  // Quiet CRT-room drone.
  addTone({ start: barStart, length: beat * 4, midi: root, gain: 0.032, type: 'sine', attack: 0.12, release: 0.16 })
  addTone({ start: barStart, length: beat * 4, midi: root + 12, gain: 0.012, type: 'triangle', attack: 0.16, release: 0.2 })

  for (let step = 0; step < 8; step += 1) {
    const time = barStart + step * eighth
    const bassMidi = step % 4 === 2 ? root + 7 : root
    addTone({ start: time, length: eighth * 0.78, midi: bassMidi, gain: 0.082, type: 'triangle', release: 0.065 })

    const arpMidi = chord[(step + bar) % chord.length] + 12
    addTone({ start: time + 0.012, length: eighth * 0.42, midi: arpMidi, gain: 0.031, type: 'square', attack: 0.004, release: 0.045 })
    addHat(time, step % 2 === 0 ? 0.013 : 0.019)
  }

  for (let pulse = 0; pulse < 4; pulse += 1) {
    addKick(barStart + pulse * beat, pulse === 0 ? 0.18 : 0.125)
  }

  // A restrained terminal acknowledgement at the end of each four-bar phrase.
  if (progression === 3) {
    addTone({ start: barStart + beat * 3.5, length: eighth * 0.33, midi: 81, gain: 0.025, type: 'sine', release: 0.04 })
  }
}

let peak = 0
for (const sample of mix) peak = Math.max(peak, Math.abs(sample))
const scale = peak === 0 ? 1 : 0.48 / peak

const wav = Buffer.alloc(44 + totalSamples * 2)
wav.write('RIFF', 0)
wav.writeUInt32LE(wav.length - 8, 4)
wav.write('WAVE', 8)
wav.write('fmt ', 12)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sampleRate, 24)
wav.writeUInt32LE(sampleRate * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(totalSamples * 2, 40)

let sumSquares = 0
for (let index = 0; index < totalSamples; index += 1) {
  const value = clamp(mix[index] * scale, -1, 1)
  sumSquares += value * value
  wav.writeInt16LE(Math.round(value * 32767), 44 + index * 2)
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, wav)

const rms = Math.sqrt(sumSquares / totalSamples)
stdout.write(`${JSON.stringify({
  outputPath,
  durationSeconds,
  sampleRate,
  channels: 1,
  peak: 0.48,
  rms: Number(rms.toFixed(4)),
  bytes: wav.length,
}, null, 2)}\n`)
