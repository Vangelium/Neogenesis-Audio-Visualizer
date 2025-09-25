import React, { useState } from 'react';
import { NeogenesisProps, AudioSource, Theme } from '../types';
import { UploadIcon, MicIcon, ChevronDownIcon, ChevronUpIcon } from './IconComponents';

interface ControlsPanelProps {
  props: NeogenesisProps;
  updateProps: <K extends keyof NeogenesisProps>(key: K, value: NeogenesisProps[K]) => void;
  onMicConnect: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  audioSource: AudioSource;
}

const ControlSlider: React.FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (val: number) => void; precision?: number }> = ({ label, value, min, max, step, onChange, precision = 2 }) => (
    <div className="mb-3">
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono bg-gray-700 text-white rounded px-2 py-1 w-14 text-center">{value.toFixed(precision)}</span>
        </div>
    </div>
);

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (val: boolean) => void; }> = ({ label, checked, onChange }) => (
    <div className="flex justify-between items-center mb-3">
        <label htmlFor={`${label}-toggle`} className="text-sm font-medium text-gray-300">{label}</label>
        <button
            id={`${label}-toggle`}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-green-500' : 'bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

export const ControlsPanel: React.FC<ControlsPanelProps> = ({ props, updateProps, onMicConnect, onFileChange, audioSource }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 backdrop-blur-md rounded-lg shadow-2xl text-white max-w-xs w-full transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 text-lg font-bold"
                aria-expanded={isOpen}
                aria-controls="controls-panel-content"
            >
                <h2>Neogenesis Controls</h2>
                {isOpen ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
            </button>
            
            <div id="controls-panel-content" className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[80vh] overflow-y-auto' : 'max-h-0'}`}>
                <div className="p-4 border-t border-gray-700">
                    {/* --- Audio Source --- */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={onMicConnect} className={`flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-md transition-colors ${audioSource === AudioSource.Microphone ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            <MicIcon className="w-4 h-4" /> Mic
                        </button>
                        <label htmlFor="audio-upload-panel" className={`flex items-center justify-center gap-2 text-sm font-bold py-2 px-3 rounded-md transition-colors cursor-pointer ${audioSource === AudioSource.File ? 'bg-pink-500' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            <UploadIcon className="w-4 h-4" /> File
                        </label>
                        <input id="audio-upload-panel" type="file" accept="audio/*" onChange={onFileChange} className="hidden" />
                    </div>

                    {/* --- General Settings --- */}
                    <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">General</h3>
                    <ToggleSwitch label="Audio Reactive" checked={props.isAudioReactive} onChange={val => updateProps('isAudioReactive', val)} />
                    <div className="mb-3">
                        <label htmlFor="theme-select" className="block text-sm font-medium text-gray-300 mb-1">Theme</label>
                        <select id="theme-select" value={props.theme} onChange={(e) => updateProps('theme', e.target.value as Theme)} className="w-full bg-gray-700 text-white rounded-md p-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500">
                            {Object.values(Theme).map(theme => (<option key={theme} value={theme}>{theme}</option>))}
                        </select>
                    </div>

                    {/* --- Planet Controls --- */}
                    <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">Planet Controls</h3>
                    <ToggleSwitch label="Show Planet" checked={props.showFractal} onChange={val => updateProps('showFractal', val)} />
                    <ToggleSwitch label="Planet Wireframe" checked={props.fractalWireframe} onChange={val => updateProps('fractalWireframe', val)} />
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${props.fractalWireframe ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pt-2">
                           <ControlSlider label="Wave Amplitude" value={props.fractalWaveAmplitude} min={0} max={1.0} step={0.05} onChange={val => updateProps('fractalWaveAmplitude', val)} />
                           <ControlSlider label="Wave Smoothing" value={props.fractalWaveSmoothing} min={0.01} max={0.5} step={0.01} onChange={val => updateProps('fractalWaveSmoothing', val)} />
                        </div>
                    </div>
                    <ControlSlider label="Fractal Detail" value={props.recursionDepth} min={0} max={6} step={1} onChange={val => updateProps('recursionDepth', val)} precision={0} />
                    <ControlSlider label="Layer Spacing" value={props.fractalLayerSpacing} min={0.3} max={1.0} step={0.05} onChange={val => updateProps('fractalLayerSpacing', val)} />
                    <ControlSlider label="Metalness" value={props.fractalMetalness} min={0} max={1.0} step={0.05} onChange={val => updateProps('fractalMetalness', val)} />
                    <ControlSlider label="Roughness" value={props.fractalRoughness} min={0} max={1.0} step={0.05} onChange={val => updateProps('fractalRoughness', val)} />

                    {/* --- Galaxy Controls --- */}
                    <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">Galaxy Controls</h3>
                    <ControlSlider label="Galaxy Radius" value={props.particleDistributionRadius} min={5} max={50} step={1} onChange={val => updateProps('particleDistributionRadius', val)} precision={0} />
                    <ControlSlider label="Particle Size" value={props.particleSize} min={0.1} max={3.0} step={0.1} onChange={val => updateProps('particleSize', val)} />
                    <ControlSlider label="Noise Strength" value={props.noiseStrength} min={0} max={1.0} step={0.05} onChange={val => updateProps('noiseStrength', val)} />

                    {/* --- Scene & Audio --- */}
                    <h3 className="text-xs font-bold uppercase text-gray-400 mt-4 mb-2">Scene & Audio</h3>
                    <ToggleSwitch label="Cinematic Camera" checked={props.cinematicCamera} onChange={val => updateProps('cinematicCamera', val)} />
                    <ControlSlider label="Rotation Speed" value={props.rotationSpeed} min={0} max={2.0} step={0.1} onChange={val => updateProps('rotationSpeed', val)} />
                    <ControlSlider label="Field of View" value={props.fieldOfView} min={30} max={120} step={1} onChange={val => updateProps('fieldOfView', val)} precision={0} />
                    <ControlSlider label="Bloom Strength" value={props.bloomStrength} min={0} max={3.0} step={0.1} onChange={val => updateProps('bloomStrength', val)} />
                    <ControlSlider label="Bass Sensitivity" value={props.bassSensitivity} min={0.1} max={3.0} step={0.1} onChange={val => updateProps('bassSensitivity', val)} />
                    <ControlSlider label="Treble Sensitivity" value={props.trebleSensitivity} min={0.1} max={3.0} step={0.1} onChange={val => updateProps('trebleSensitivity', val)} />
                </div>
            </div>
        </div>
    );
};