import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNeogenesis } from './hooks/useNeogenesis';
import { NeogenesisProps, AudioSource, Theme } from './types';
import { AudioProcessor } from './services/AudioProcessor';
import { ControlsPanel } from './components/ControlsPanel';
import { MicIcon, UploadIcon, FullscreenEnterIcon, FullscreenExitIcon } from './components/IconComponents';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>(AudioSource.None);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // --- STATE DEFINITIONS FOR CONTROLS ---
  const [props, setProps] = useState<NeogenesisProps>({
    isAudioReactive: true,
    theme: Theme.Nebula,
    particleSize: 1.0,
    bassSensitivity: 1.0,
    trebleSensitivity: 1.0,
    noiseStrength: 0.1,
    rotationSpeed: 0.2,
    fieldOfView: 75,
    bloomStrength: 0.5,
    recursionDepth: 2,
    showFractal: true,
    fractalWireframe: false,
    particleDistributionRadius: 10,
    fractalLayerSpacing: 0.7,
    fractalMetalness: 0.1,
    fractalRoughness: 0.5,
    fractalWaveAmplitude: 0.25,
    fractalWaveSmoothing: 0.1,
    cinematicCamera: false,
  });

  const updateProps = <K extends keyof NeogenesisProps>(key: K, value: NeogenesisProps[K]) => {
    setProps(prev => ({ ...prev, [key]: value }));
  };
  
  // Initialize AudioProcessor once
  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor();
  }, []);

  const handleMicConnect = useCallback(async () => {
    if (audioProcessorRef.current) {
      await audioProcessorRef.current.connectMicrophone();
      setAudioSource(AudioSource.Microphone);
      setIsInitialized(true);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && audioRef.current && audioProcessorRef.current) {
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        audioProcessorRef.current?.connectFile(audioRef.current!);
        setAudioSource(AudioSource.File);
        setIsInitialized(true);
      }).catch(error => console.error("Audio playback failed:", error));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);


  useNeogenesis(canvasRef, props, audioProcessorRef);

  return (
    <div className="w-screen h-screen bg-black text-gray-200 font-sans">
      <ControlsPanel 
        props={props}
        updateProps={updateProps}
        onMicConnect={handleMicConnect}
        onFileChange={handleFileChange}
        audioSource={audioSource}
      />
      <button 
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-20 p-2 bg-black bg-opacity-40 rounded-full text-white hover:bg-opacity-60 transition-colors"
        aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
      >
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
      </button>

      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      <audio 
        ref={audioRef} 
        loop 
        controls 
        crossOrigin="anonymous" 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-md transition-opacity duration-500 ${audioSource === AudioSource.File ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      
      {!isInitialized && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col justify-center items-center z-20 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-2 tracking-wider">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                    NEOGENESIS
                </span>
            </h1>
            <p className="text-gray-300 mb-8 text-lg">An Interactive Audio-Reactive Visualizer</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleMicConnect} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">
                <MicIcon /> Use Microphone
              </button>
              <label htmlFor="audio-upload" className="flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg cursor-pointer">
                <UploadIcon /> Upload Audio
              </label>
              <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;