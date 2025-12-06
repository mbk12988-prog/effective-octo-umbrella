import { MelodyData, Note } from '../types';

// Helper map for note name to MIDI number
const noteToMidi: Record<string, number> = {};
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Populate MIDI map
for (let octave = 0; octave <= 8; octave++) {
  notes.forEach((note, index) => {
    noteToMidi[`${note}${octave}`] = 12 + (octave * 12) + index;
  });
}

function stringToBytes(str: string): number[] {
  return str.split('').map(char => char.charCodeAt(0));
}

function numberToBytes(num: number, bytes: number): number[] {
  const result = [];
  for (let i = bytes - 1; i >= 0; i--) {
    result.push((num >> (8 * i)) & 0xFF);
  }
  return result;
}

function writeVarInt(value: number): number[] {
  const bytes = [];
  let buffer = value & 0x7F;
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= ((value & 0x7F) | 0x80);
  }
  while (true) {
    bytes.push(buffer & 0xFF);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

/**
 * Generates a simple Type 0 MIDI file from the MelodyData.
 * This is a low-level byte construction to avoid external dependencies.
 */
export function generateMidiBlob(melody: MelodyData): Blob {
  const TICKS_PER_BEAT = 480;
  // Calculate microseconds per beat for the tempo set event
  // 60,000,000 / BPM
  const microSecondsPerBeat = Math.round(60000000 / melody.bpm);

  // MThd Chunk
  const header = [
    ...stringToBytes('MThd'),
    ...numberToBytes(6, 4), // Chunk size
    ...numberToBytes(0, 2), // Format Type 0 (single track)
    ...numberToBytes(1, 2), // Number of tracks
    ...numberToBytes(TICKS_PER_BEAT, 2) // Time division
  ];

  // MTrk Chunk Events
  let trackEvents: number[] = [];

  // 1. Tempo Meta Event (FF 51 03 tttttt)
  trackEvents.push(0x00); // Delta time 0
  trackEvents.push(0xFF, 0x51, 0x03, ...numberToBytes(microSecondsPerBeat, 3));

  // Convert notes to events (Note On / Note Off)
  interface MidiEvent {
    tick: number;
    type: 'on' | 'off';
    note: number;
    velocity: number;
  }

  const events: MidiEvent[] = [];
  const secondsToTicks = (seconds: number) => {
    const beats = seconds * (melody.bpm / 60);
    return Math.round(beats * TICKS_PER_BEAT);
  };

  melody.notes.forEach(note => {
    const midiNote = noteToMidi[note.pitch] || 60; // Default to Middle C if parse fails
    const startTick = secondsToTicks(note.startTime);
    const endTick = secondsToTicks(note.startTime + note.duration);
    const velocity = Math.floor(note.velocity * 127);

    events.push({ tick: startTick, type: 'on', note: midiNote, velocity });
    events.push({ tick: endTick, type: 'off', note: midiNote, velocity: 0 });
  });

  // Sort events by time
  events.sort((a, b) => a.tick - b.tick);

  let lastTick = 0;
  events.forEach(event => {
    const delta = event.tick - lastTick;
    lastTick = event.tick;

    trackEvents.push(...writeVarInt(delta));
    
    if (event.type === 'on') {
      trackEvents.push(0x90, event.note, event.velocity);
    } else {
      trackEvents.push(0x80, event.note, 0);
    }
  });

  // End of Track Meta Event
  trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

  // Construct final track chunk
  const trackHeader = [
    ...stringToBytes('MTrk'),
    ...numberToBytes(trackEvents.length, 4)
  ];

  const fileData = new Uint8Array([...header, ...trackHeader, ...trackEvents]);
  return new Blob([fileData], { type: 'audio/midi' });
}
