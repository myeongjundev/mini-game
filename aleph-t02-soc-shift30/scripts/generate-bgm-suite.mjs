import { Buffer } from 'node:buffer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { stdout } from 'node:process'

const rate = 22050
const midiHz = (midi) => 440 * 2 ** ((midi - 69) / 12)
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

function createTrack(seconds, seed) {
  const data = new Float64Array(rate * seconds)
  let noiseSeed = seed >>> 0

  function wave(type, phase) {
    const cycle = phase / (Math.PI * 2)
    const position = cycle - Math.floor(cycle)
    if (type === 'pulse') return position < 0.2 ? 1 : -1
    if (type === 'triangle') return 1 - 4 * Math.abs(position - 0.5)
    return Math.sin(phase)
  }

  function tone({ at, length, midi, level, type = 'sine', attack = 0.01, release = 0.08, bend = 0 }) {
    const first = Math.max(0, Math.floor(at * rate))
    const last = Math.min(data.length, Math.ceil((at + length) * rate))
    const frequency = midiHz(midi)
    for (let index = first; index < last; index += 1) {
      const local = index / rate - at
      const envelope = Math.min(clamp(local / attack, 0, 1), clamp((length - local) / release, 0, 1))
      const currentFrequency = frequency * (1 + bend * local / Math.max(length, 0.001))
      data[index] += wave(type, Math.PI * 2 * currentFrequency * local) * level * envelope
    }
  }

  function randomSigned() {
    noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0
    return noiseSeed / 0xffffffff * 2 - 1
  }

  function tick(at, level = 0.015) {
    const length = 0.028
    const first = Math.floor(at * rate)
    const last = Math.min(data.length, Math.ceil((at + length) * rate))
    let previous = 0
    for (let index = first; index < last; index += 1) {
      const local = index / rate - at
      const sample = randomSigned()
      const edge = sample - previous * 0.9
      previous = sample
      data[index] += edge * level * Math.exp(-local * 105)
    }
  }

  function pulse(at, level, midi = 28) {
    tone({ at, length: 0.18, midi, level, attack: 0.004, release: 0.125, bend: -0.13 })
  }

  return { seconds, data, tone, tick, pulse }
}

function addEquipmentHum(track, level) {
  for (let index = 0; index < track.data.length; index += 1) {
    const time = index / rate
    const breathing = 0.78 + Math.sin(Math.PI * 2 * 0.125 * time) * 0.1
    track.data[index] += (
      Math.sin(Math.PI * 2 * 55 * time) * level +
      Math.sin(Math.PI * 2 * 110 * time) * level * 0.32
    ) * breathing
  }
}

function render(track, filename, targetPeak) {
  let peak = 0
  for (const sample of track.data) peak = Math.max(peak, Math.abs(sample))
  const scale = peak === 0 ? 1 : targetPeak / peak
  const wav = Buffer.alloc(44 + track.data.length * 2)
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
  wav.writeUInt32LE(track.data.length * 2, 40)

  let sumSquares = 0
  for (let index = 0; index < track.data.length; index += 1) {
    const value = clamp(track.data[index] * scale, -1, 1)
    sumSquares += value * value
    wav.writeInt16LE(Math.round(value * 32767), 44 + index * 2)
  }

  const path = resolve(`public/audio/${filename}`)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, wav)
  return {
    filename,
    seconds: track.seconds,
    peak: targetPeak,
    rms: Number(Math.sqrt(sumSquares / track.data.length).toFixed(4)),
    bytes: wav.length,
  }
}

// LOBBY — a comfortable pre-shift safe space, 32 seconds at 60 BPM, no drums.
const lobby = createTrack(32, 0x10bb10bb)
addEquipmentHum(lobby, 0.008)
const lobbyBeat = 1
const lobbyChords = [
  [50, 53, 57, 60], // Dm7
  [46, 50, 53, 57], // Bbmaj7
  [41, 45, 48, 52], // Fmaj7
  [48, 52, 55, 62], // Cadd9
]
for (let bar = 0; bar < 8; bar += 1) {
  const start = bar * lobbyBeat * 4
  const chord = lobbyChords[bar % lobbyChords.length]
  for (const note of chord) {
    lobby.tone({ at: start, length: lobbyBeat * 4, midi: note, level: 0.011, attack: 0.65, release: 0.75 })
  }
  if (bar % 2 === 0) {
    lobby.tone({ at: start + lobbyBeat * 2.75, length: 0.32, midi: 74 + (bar % 4) * 2, level: 0.012, type: 'triangle', attack: 0.03, release: 0.22 })
  }
}

// PLAY — steady analyst rhythm, 30 seconds at 120 BPM, intentionally non-escalating.
const play = createTrack(30, 0x50c50117)
addEquipmentHum(play, 0.012)
const playBeat = 0.5
const playRoots = [28, 28, 31, 26]
const playSignals = [52, 58, 55, 61]
for (let bar = 0; bar < 15; bar += 1) {
  const start = bar * playBeat * 4
  const root = playRoots[bar % playRoots.length]
  for (let step = 0; step < 8; step += 1) {
    const at = start + step * playBeat / 2
    if (step % 2 === 0) play.pulse(at, step === 0 ? 0.105 : 0.068, root)
    play.tick(at + 0.012, step % 4 === 3 ? 0.021 : 0.011)
    if (step % 4 === 1) {
      play.tone({ at, length: 0.085, midi: playSignals[(bar + step) % playSignals.length] + 12, level: 0.016, type: 'pulse', attack: 0.002, release: 0.04 })
    }
  }
}

// CRITICAL — eight-second replacement loop for lives === 1, fast heartbeat and warning tritone.
const critical = createTrack(8, 0x0ea271fe)
addEquipmentHum(critical, 0.014)
const criticalBeat = 0.5
for (let bar = 0; bar < 4; bar += 1) {
  const start = bar * criticalBeat * 4
  for (let step = 0; step < 8; step += 1) {
    const at = start + step * criticalBeat / 2
    critical.pulse(at, step % 4 === 0 ? 0.16 : 0.1, step % 2 === 0 ? 28 : 27)
    critical.tick(at + 0.008, step % 2 === 0 ? 0.027 : 0.018)
    if (step % 2 === 0) {
      critical.tone({ at: at + 0.025, length: 0.13, midi: 64, level: 0.027, type: 'triangle', release: 0.075 })
      critical.tone({ at: at + 0.025, length: 0.13, midi: 70, level: 0.021, type: 'triangle', release: 0.075 })
    }
  }
}

const report = [
  render(lobby, 'soc-shift-lobby-loop.wav', 0.28),
  render(play, 'soc-shift-play-loop.wav', 0.4),
  render(critical, 'soc-shift-critical-heart-loop.wav', 0.46),
]
stdout.write(`${JSON.stringify(report, null, 2)}\n`)
