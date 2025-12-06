import React, { useState } from 'react';
import { Loader2, Sparkles, Music, Sliders, Layers } from 'lucide-react';
import { GeneratorOptions } from '../types';

interface InputFormProps {
  onGenerate: (options: GeneratorOptions) => Promise<void>;
  isGenerating: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState('Neutral');
  const [tempo, setTempo] = useState('Moderate');
  const [duration, setDuration] = useState('Radio Edit');
  const [structure, setStructure] = useState('Verse-Chorus');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate({ prompt, mood, tempo, duration, structure });
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl mx-auto shadow-xl transition-all duration-300 hover:shadow-purple-900/20">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Music className="h-5 w-5 text-slate-400 group-focus-within:text-purple-400 transition-colors" />
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your song (e.g., 'A melancholic cinematic journey in D minor')"
            className="block w-full pl-10 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            disabled={isGenerating}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-slate-400 hover:text-purple-400 transition-colors"
          >
            <Sliders className="w-4 h-4 mr-1" />
            {showAdvanced ? 'Hide Advanced Settings' : 'Advanced Settings'}
          </button>
          <span className="text-slate-500 text-xs">AI Powered by Gemini 2.5</span>
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mood & Style</label>
              <select 
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option>Neutral</option>
                <option>Cinematic / Epic</option>
                <option>Sad / Melancholic</option>
                <option>Happy / Upbeat</option>
                <option>Jazz / Lo-fi</option>
                <option>Dark / Tension</option>
                <option>Romantic</option>
                <option>Classical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tempo</label>
              <select
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option>Slow (60-80 BPM)</option>
                <option>Moderate (90-110 BPM)</option>
                <option>Fast (120+ BPM)</option>
                <option>Free Tempo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="Sketch">Sketch (~45s)</option>
                <option value="Radio Edit">Radio Edit (~2m)</option>
                <option value="Full Song">Full Song (~3.5m)</option>
                <option value="Extended">Extended (~5m)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Structure</label>
              <select
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="Verse-Chorus">Verse-Chorus (Pop/Rock)</option>
                <option value="Cinematic Build">Cinematic Build (Linear)</option>
                <option value="Theme-Variations">Theme & Variations (Classical)</option>
                <option value="Jazz Improv">Head-Solos-Head (Jazz)</option>
                <option value="Ambient Flow">Ambient Flow (Repetitive)</option>
              </select>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]
            ${isGenerating 
              ? 'bg-slate-700 cursor-not-allowed opacity-75' 
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 shadow-purple-500/25'
            }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Composing Masterpiece...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate Song</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};