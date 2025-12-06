import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { PianoRoll } from './components/PianoRoll';
import { Controls } from './components/Controls';
import { generateMelody } from './services/geminiService';
import { AudioEngine } from './services/audioEngine';
import { generateMidiBlob } from './services/midiUtils';
import { MelodyData, PlaybackState, GeneratorOptions } from './types';
import { Music2, Layers, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [melody, setMelody] = useState<MelodyData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.STOPPED);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Audio Engine Instance
  const audioEngine = React.useRef<AudioEngine | null>(null);

  useEffect(() => {
    audioEngine.current = new AudioEngine((state, time) => {
      setPlaybackState(state);
      setCurrentTime(time);
    });
    return () => {
      audioEngine.current?.stop();
    };
  }, []);

  const handleGenerate = async (options: GeneratorOptions) => {
    setIsGenerating(true);
    setError(null);
    setMelody(null); // Clear previous
    audioEngine.current?.stop();

    try {
      const newMelody = await generateMelody(options);
      setMelody(newMelody);
      await audioEngine.current?.loadMelody(newMelody);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlay = () => audioEngine.current?.play();
  const handlePause = () => audioEngine.current?.pause();
  const handleStop = () => audioEngine.current?.stop();
  const handleReset = () => {
    handleStop();
    setMelody(null);
    setCurrentTime(0);
  };

  const handleDownloadMidi = () => {
    if (!melody) return;
    const blob = generateMidiBlob(melody);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${melody.title.replace(/\s+/g, '_')}_MuseFlow.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white selection:bg-purple-500/30">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-purple-600 to-blue-500 p-2 rounded-lg">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Muse<span className="text-purple-400">Flow</span> Studio
            </h1>
          </div>
          <span className="text-xs font-mono text-slate-500 border border-slate-800 px-2 py-1 rounded-full">v2.1 Pro</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        
        {/* Hero Section */}
        {!melody && !isGenerating && (
          <div className="text-center space-y-4 mb-12 animate-in fade-in zoom-in-95 duration-700">
            <h2 className="text-5xl font-extrabold pb-2">
              <span className="gradient-text">Compose Cinematic Masterpieces</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Create emotive, full-length piano compositions with AI. Customize structure, dynamics, and duration (up to 5 mins), then export to your DAW.
            </p>
          </div>
        )}

        {/* Input Section */}
        <section className={`transition-all duration-500 ${melody ? 'scale-95 opacity-90' : 'scale-100'}`}>
          <InputForm onGenerate={handleGenerate} isGenerating={isGenerating} />
        </section>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 text-center max-w-xl mx-auto">
            {error}
          </div>
        )}

        {/* Results Section */}
        {melody && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Metadata Card */}
            <div className="flex flex-col md:flex-row items-start justify-between bg-slate-900/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-white tracking-tight">{melody.title}</h3>
                <div className="flex flex-wrap gap-2">
                   <Badge color="bg-blue-500" label={`${melody.bpm} BPM`} />
                   <Badge color="bg-purple-500" label={`${melody.key} ${melody.scale}`} />
                   <Badge color="bg-pink-500" label={melody.mood} />
                   <Badge color="bg-emerald-500" label={formatTime(melody.totalDuration)} />
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-col items-end space-y-1 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4" />
                  <span>Structure</span>
                </div>
                <div className="flex flex-wrap justify-end gap-1 max-w-md">
                   {melody.sections.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
                        {s.name}
                      </span>
                   ))}
                </div>
              </div>
            </div>

            {/* Visualizer */}
            <div className="relative group">
               <PianoRoll 
                  melody={melody} 
                  currentTime={currentTime}
                  height={320}
                  width={1000} 
               />
               <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/10"></div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
              <Controls 
                playbackState={playbackState}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onReset={handleReset}
                onDownloadMidi={handleDownloadMidi}
                hasMelody={!!melody}
              />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} MuseFlow AI. Generated compositions are royalty-free.</p>
      </footer>
    </div>
  );
};

// Helper Components
const Badge = ({ color, label }: { color: string, label: string }) => (
  <span className="flex items-center text-xs font-semibold bg-slate-800 text-slate-200 px-3 py-1 rounded-full border border-slate-700">
    <span className={`w-2 h-2 rounded-full ${color} mr-2 shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></span>
    {label}
  </span>
);

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

export default App;