import React, { useRef, useEffect, useState } from 'react';
import { MelodyData } from '../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface PianoRollProps {
  melody: MelodyData | null;
  currentTime: number;
  width?: number;
  height?: number;
}

export const PianoRoll: React.FC<PianoRollProps> = ({ 
  melody, 
  currentTime, 
  width = 1000, 
  height = 300 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(30);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !melody) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Layout Constants
    const NOTE_HEIGHT = 10;
    const HEADER_HEIGHT = 24; 
    
    // Find pitch range
    const noteToVal = (n: string) => {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = parseInt(n.slice(-1));
      const key = n.slice(0, -1);
      return (octave * 12) + notes.indexOf(key);
    };

    const pitches = melody.notes.map(n => noteToVal(n.pitch));
    // Determine reasonable range (centered around middle)
    let minPitch = Math.min(...pitches) - 2;
    let maxPitch = Math.max(...pitches) + 2;
    // Clamp height if range is too small to look good
    if (maxPitch - minPitch < 20) {
        minPitch -= 10;
        maxPitch += 10;
    }

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    // Determine scrolling: Center current time
    const centerX = width / 3; // Position playhead at 1/3 screen
    const scrollX = (currentTime * pixelsPerSecond) - centerX;
    const effectiveScrollX = Math.max(-50, scrollX);
    
    ctx.save();
    ctx.translate(-effectiveScrollX, 0);

    // Draw Section Markers
    melody.sections.forEach((section, index) => {
      const x = section.startTime * pixelsPerSecond;
      const w = section.duration * pixelsPerSecond;
      
      // Alternating background
      ctx.fillStyle = index % 2 === 0 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(15, 23, 42, 0.0)';
      ctx.fillRect(x, 0, w, height);

      // Border
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter';
      ctx.fillText(section.name.toUpperCase(), x + 8, 16);
    });

    // Draw Grid Lines (Bars)
    const secondsPerBeat = 60 / melody.bpm;
    const secondsPerBar = secondsPerBeat * 4; // Assume 4/4 for grid visual
    const barWidth = secondsPerBar * pixelsPerSecond;
    
    // Optimization: Draw only visible area
    const startDrawTime = effectiveScrollX / pixelsPerSecond;
    const endDrawTime = (effectiveScrollX + width) / pixelsPerSecond;
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    // Snap to bars
    const firstBar = Math.floor(startDrawTime / secondsPerBar);
    const lastBar = Math.ceil(endDrawTime / secondsPerBar);

    for (let b = firstBar; b <= lastBar; b++) {
        const x = b * barWidth;
        ctx.beginPath();
        ctx.moveTo(x, HEADER_HEIGHT);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Draw Notes
    melody.notes.forEach(note => {
      // Visibility Check
      if (note.startTime > endDrawTime || note.startTime + note.duration < startDrawTime) return;

      const x = note.startTime * pixelsPerSecond;
      const w = Math.max(note.duration * pixelsPerSecond, 2);
      
      // Calculate Y
      const val = noteToVal(note.pitch);
      const relativePitch = val - minPitch;
      const y = height - (relativePitch * NOTE_HEIGHT) - 40; 

      // Active state
      const isActive = currentTime >= note.startTime && currentTime <= (note.startTime + note.duration);
      
      // Velocity opacity
      const opacity = 0.5 + (note.velocity * 0.5);

      if (isActive) {
        ctx.fillStyle = '#e879f9'; // Bright pink/purple
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#e879f9';
      } else {
        ctx.fillStyle = `rgba(99, 102, 241, ${opacity})`; // Indigo with velocity alpha
        ctx.shadowBlur = 0;
      }
      
      ctx.beginPath();
      ctx.roundRect(x, y, w - 1, NOTE_HEIGHT - 2, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Playhead
    const playheadX = currentTime * pixelsPerSecond;
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead Triangle Cap
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 8);
    ctx.fill();

    ctx.restore();

  }, [melody, currentTime, width, height, pixelsPerSecond]);

  return (
    <div className="relative w-full rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden group">
       {/* Zoom Controls Overlay */}
       <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-slate-800/80 backdrop-blur px-2 py-1 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button 
            onClick={() => setPixelsPerSecond(Math.max(10, pixelsPerSecond - 10))}
            className="p-1 hover:text-white text-slate-400"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-slate-300 font-mono w-8 text-center">{Math.round(pixelsPerSecond)}%</span>
          <button 
             onClick={() => setPixelsPerSecond(Math.min(100, pixelsPerSecond + 10))}
             className="p-1 hover:text-white text-slate-400"
          >
            <ZoomIn size={16} />
          </button>
       </div>

       {/* Time Display */}
       <div className="absolute top-2 right-4 text-xs font-mono text-slate-400 pointer-events-none bg-slate-900/50 px-2 rounded">
          {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')} / 
          {melody ? `${Math.floor(melody.totalDuration / 60)}:${(melody.totalDuration % 60).toFixed(0).padStart(2, '0')}` : '0:00'}
       </div>

      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};