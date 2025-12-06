import React from 'react';
import { Play, Pause, Square, Download, RefreshCw } from 'lucide-react';
import { PlaybackState } from '../types';

interface ControlsProps {
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onDownloadMidi: () => void;
  onReset: () => void;
  hasMelody: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  playbackState,
  onPlay,
  onPause,
  onStop,
  onDownloadMidi,
  onReset,
  hasMelody
}) => {
  if (!hasMelody) return null;

  return (
    <div className="flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center space-x-6">
        <button
          onClick={onStop}
          className="p-3 rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
          title="Stop"
        >
          <Square className="w-5 h-5 fill-current" />
        </button>

        <button
          onClick={playbackState === PlaybackState.PLAYING ? onPause : onPlay}
          className="p-6 rounded-full bg-white text-slate-900 shadow-xl shadow-white/10 hover:shadow-white/20 hover:scale-105 active:scale-95 transition-all"
        >
          {playbackState === PlaybackState.PLAYING ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={onReset}
          className="p-3 rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
          title="New Melody"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={onDownloadMidi}
          className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors border border-slate-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export MIDI
        </button>
      </div>
    </div>
  );
};
