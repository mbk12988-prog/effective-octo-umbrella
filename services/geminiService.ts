import { GoogleGenAI, Type } from "@google/genai";
import { MelodyData, Note, SongSection, GeneratorOptions } from "../types";

const SYSTEM_INSTRUCTION = `
You are MuseFlow, an elite AI composer specializing in creating emotionally complex, human-sounding piano compositions.
Your task is to compose full-length songs with distinct structural sections, evolving dynamics, and rich harmony.

Guidelines:
1. Output strict JSON.
2. Structure the song into sections (e.g., Intro, Verse, Chorus, Bridge, Outro).
3. Use Scientific Pitch Notation (C4, F#5).
4. Timing is in BEATS (not seconds).
   - "b" (start_beat): 0-indexed relative to section start.
   - "d" (duration_beats): length in beats.
   - "v" (velocity): 0.1 (soft) to 1.0 (loud). USE DYNAMICS! Crescendos, accents, ghost notes.
5. Create "human" feel: varying velocities, slight timing offsets (rubato) are implied by the music style but keep grid data clean.
6. TOKEN OPTIMIZATION:
   - For repeated sections (like a second Chorus), use "copy_section_index" to reference a previous section's notes.
   - Do NOT output "notes" if "copy_section_index" is present.
   - You can assume the playback engine will duplicate the notes.

Notes Schema: "p" (pitch), "b" (beat), "d" (duration), "v" (velocity).
`;

interface RawSection {
  name: string;
  bars: number;
  // If notes is present
  notes?: { p: string; b: number; d: number; v: number }[];
  // If copying another section
  copy_section_index?: number; 
}

interface RawResponse {
  title: string;
  bpm: number;
  key: string;
  scale: string;
  mood: string;
  sections: RawSection[];
}

export const generateMelody = async (
  options: GeneratorOptions
): Promise<MelodyData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct a detailed prompt based on options
  let structureHint = "";
  switch(options.duration) {
    case "Sketch":
      structureHint = "Length: ~45s. Structure: Intro, Theme, Outro.";
      break;
    case "Radio Edit":
      structureHint = "Length: ~2 mins. Structure: Intro, Verse 1, Chorus 1, Verse 2, Chorus 2, Outro.";
      break;
    case "Full Song":
      structureHint = "Length: ~3.5 mins. Structure: Intro, Verse 1, Chorus 1, Verse 2, Chorus 2, Bridge, Chorus 3, Outro.";
      break;
    case "Extended":
      structureHint = "Length: ~5 mins. Structure: Long Intro, Verse 1, Chorus 1, Verse 2, Chorus 2, Extended Solo/Bridge, Chorus 3, Outro. Complex evolution.";
      break;
  }

  const userPrompt = `
    Compose a piano masterpiece.
    Description: "${options.prompt}"
    Mood: ${options.mood}
    Tempo: ${options.tempo}
    Structure Style: ${options.structure}
    ${structureHint}
    
    CRITICAL: 
    - Use 'copy_section_index' for repeated sections (e.g. Chorus 2) to save output length.
    - Ensure distinct character between Verses and Choruses.
    - Add left-hand accompaniment (chords/arpeggios) and right-hand melody.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bpm: { type: Type.INTEGER },
            key: { type: Type.STRING },
            scale: { type: Type.STRING },
            mood: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  bars: { type: Type.INTEGER },
                  copy_section_index: { type: Type.INTEGER, nullable: true },
                  notes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        p: { type: Type.STRING },
                        b: { type: Type.NUMBER },
                        d: { type: Type.NUMBER },
                        v: { type: Type.NUMBER }
                      },
                      required: ["p", "b", "d", "v"]
                    },
                    nullable: true
                  }
                },
                required: ["name", "bars"]
              }
            }
          },
          required: ["title", "bpm", "key", "scale", "sections"]
        }
      }
    });

    const rawData = JSON.parse(response.text || "{}") as RawResponse;
    return processRawData(rawData);

  } catch (error) {
    console.error("Error generating melody:", error);
    throw new Error("Failed to generate composition. Please try again.");
  }
};

function processRawData(data: RawResponse): MelodyData {
  const secondsPerBeat = 60 / data.bpm;
  // Assume 4/4 usually, but model determines beat placement.
  const beatsInBar = 4;
  
  const flattenedNotes: Note[] = [];
  const processedSections: SongSection[] = [];
  
  // To handle copies, we need to store notes per section index temporarily
  const sectionNotesMap: Map<number, Note[]> = new Map();
  
  let currentSectionStartTime = 0;

  data.sections.forEach((section, index) => {
    const sectionDurationBeats = section.bars * beatsInBar;
    const sectionDurationSeconds = sectionDurationBeats * secondsPerBeat;

    processedSections.push({
      name: section.name,
      startTime: currentSectionStartTime,
      duration: sectionDurationSeconds
    });

    let currentSectionNotes: Note[] = [];

    // Check if copying
    if (section.copy_section_index !== undefined && section.copy_section_index !== null) {
      // Retrieve notes from referenced section (relative times)
      // We must access the *source* data notes, not the flattened ones.
      // However, we stored flat notes in 'sectionNotesMap' but defined relative to 0.
      const sourceNotes = sectionNotesMap.get(section.copy_section_index);
      if (sourceNotes) {
        // Clone notes
        currentSectionNotes = sourceNotes.map(n => ({...n}));
      }
    } else if (section.notes) {
      // New notes
      currentSectionNotes = section.notes.map(rawNote => ({
        pitch: rawNote.p,
        startTime: rawNote.b * secondsPerBeat, // Relative to section start
        duration: rawNote.d * secondsPerBeat,
        velocity: rawNote.v
      }));
    }

    // Store for potential future copying
    sectionNotesMap.set(index, currentSectionNotes);

    // Add to main timeline with offset
    currentSectionNotes.forEach(note => {
      flattenedNotes.push({
        pitch: note.pitch,
        startTime: currentSectionStartTime + note.startTime, // Offset by section start
        duration: note.duration,
        velocity: note.velocity
      });
    });

    currentSectionStartTime += sectionDurationSeconds;
  });

  return {
    title: data.title,
    bpm: data.bpm,
    key: data.key,
    scale: data.scale,
    mood: data.mood,
    notes: flattenedNotes,
    sections: processedSections,
    totalDuration: currentSectionStartTime
  };
}