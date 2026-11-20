import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Mic, Square } from 'lucide-react';
import { CameraPreset } from '../game/three/ThreeSceneRenderer';

interface GameDockProps {
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  onVoiceCommand: (transcript: string) => string | null;
}

const CAMERA_OPTIONS: Array<{ id: CameraPreset; label: string }> = [
  { id: 'side', label: 'Side Duel' },
  { id: 'cinematic', label: '3/4 View' },
  { id: 'follow', label: 'Dynamic' },
];

export const GameDock: React.FC<GameDockProps> = ({
  cameraPreset,
  onSelectCamera,
  onVoiceCommand,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string>('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopStream();
    };
  }, [stopStream]);

  // Keyboard shortcuts: H toggles dock collapse, C cycles camera presets
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.code === 'KeyH') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        const idx = CAMERA_OPTIONS.findIndex((o) => o.id === cameraPreset);
        const next = CAMERA_OPTIONS[(idx + 1) % CAMERA_OPTIONS.length];
        onSelectCamera(next.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cameraPreset, onSelectCamera]);

  const sendAudioForTranscription = useCallback(
    async (blob: Blob, mimeType: string) => {
      setTranscribing(true);
      setVoiceNote('Transcribing...');
      try {
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const audioBase64 = btoa(binary);

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64, mimeType }),
        });

        const payload = (await res.json()) as {
          transcript?: string;
          error?: string;
        };

        if (!res.ok) {
          setVoiceNote(payload.error || 'Transcription unavailable');
          return;
        }

        const text = (payload.transcript || '').trim();
        if (!text) {
          setVoiceNote('No speech detected');
          return;
        }

        const actionLabel = onVoiceCommand(text);
        setVoiceNote(actionLabel ? `"${text}" -> ${actionLabel}` : `"${text}"`);
      } catch {
        setVoiceNote('Network error transcribing audio');
      } finally {
        setTranscribing(false);
      }
    },
    [onVoiceCommand],
  );

  const handleToggleMic = async () => {
    if (transcribing) return;

    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceNote('Microphone recording unsupported in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stopStream();
        const finalType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalType });
        chunksRef.current = [];
        if (blob.size > 0) {
          void sendAudioForTranscription(blob, finalType);
        } else {
          setVoiceNote('Recording empty');
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setVoiceNote('Listening... click Stop');
    } catch {
      stopStream();
      setVoiceNote('Microphone permission denied');
    }
  };

  return (
    <aside
      aria-label="3D view and voice controls"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none max-w-[calc(100vw-24px)]"
    >
      {/* Top-edge collapse toggle */}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          setCollapsed((c) => !c);
        }}
        aria-expanded={!collapsed}
        title="Toggle Controls (H)"
        className="pointer-events-auto mb-1 px-2.5 py-0.5 rounded-t-lg rounded-b-sm bg-[#151822] text-[#CBD5E1] hover:text-[#FFFDF7] border-2 border-[#090A0D] text-[11px] font-display font-bold flex items-center gap-1 shadow-[0_2px_0_#090A0D] cursor-pointer"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Controls (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Hide Controls (H)</span>
          </>
        )}
      </button>

      {!collapsed && (
        <div className="pointer-events-auto cartoon-panel rounded-2xl px-2.5 py-1.5 flex flex-wrap items-center justify-center gap-2">
          {/* Camera presets */}
          <div className="flex items-center gap-1" role="group" aria-label="Camera presets (C)">
            <Camera className="w-3.5 h-3.5 text-[#FACC15] mx-1 shrink-0" aria-hidden="true" />
            {CAMERA_OPTIONS.map((opt) => {
              const active = cameraPreset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  tabIndex={-1}
                  aria-pressed={active}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectCamera(opt.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-display font-bold border border-[#090A0D] transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#E84A27] text-[#FFFDF7]'
                      : 'bg-[#232838] text-[#CBD5E1] hover:bg-[#2F364B]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <span className="hidden sm:inline text-[#475569]" aria-hidden="true">
            |
          </span>

          {/* Voice command transcription */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              tabIndex={-1}
              disabled={transcribing}
              onClick={(e) => {
                e.currentTarget.blur();
                void handleToggleMic();
              }}
              aria-label={recording ? 'Stop voice recording' : 'Record voice command'}
              title="Say Triple, Fire, Standard, 3/4, Side, Follow, Pause, or Restart"
              className={`px-2.5 py-1 rounded-lg text-xs font-display font-bold border border-[#090A0D] flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                recording
                  ? 'bg-[#DC2626] text-[#FFFDF7]'
                  : transcribing
                    ? 'bg-[#334155] text-[#94A3B8] cursor-wait'
                    : 'bg-[#232838] text-[#F8FAFC] hover:bg-[#2F364B]'
              }`}
            >
              {recording ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{transcribing ? 'Transcribing...' : 'Voice'}</span>
                </>
              )}
            </button>

            {voiceNote && (
              <span className="text-[11px] font-medium text-[#E2E8F0] max-w-[180px] truncate">
                {voiceNote}
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
