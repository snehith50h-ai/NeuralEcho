import React, { useState } from 'react';
import AudioCapture from './components/AudioCapture';
import ParticleVortex from './components/ParticleVortex';
import CustomCursor from './components/CustomCursor';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, BrainCircuit, Dna, ActivitySquare, Server, Microchip } from 'lucide-react';

function App() {
  const [batteryStep, setBatteryStep] = useState(0); 
  const [analysisResult, setAnalysisResult] = useState(null);
  
  const [analyzer, setAnalyzer] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [blobs, setBlobs] = useState({ vowel: null, ddk: null });
  const [dashboardMode, setDashboardMode] = useState('patient'); // 'patient' or 'triage'

  const mockPastData = [
    { visit: "Jan", risk: 0.2 },
    { visit: "Mar", risk: 0.25 },
    { visit: "Jun", risk: 0.35 },
    { visit: "Sep", risk: 0.42 },
  ];

  const handleRecordingComplete = async (wavBlob, type, isUpload = false) => {
    const newBlobs = { ...blobs, [type]: wavBlob };
    setBlobs(newBlobs);
    
    if (isUpload) {
      setBatteryStep(4);
      submitForAnalysis(wavBlob);
      return;
    }
    
    if (type === 'vowel') {
      setBatteryStep(2);
    } else if (type === 'ddk') {
      setBatteryStep(4);
      submitForAnalysis(newBlobs.vowel);
    }
  };

  const submitForAnalysis = async (fileToAnalyze) => {
      try {
        const formData = new FormData();
        formData.append('file', fileToAnalyze, 'upload.wav');
        formData.append('test_type', 'aggregated');
        
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/api/analyze-voice`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.detail || `Server returned ${res.status}`);
        }
        const data = await res.json();
        setAnalysisResult(data);
        setBatteryStep(5);
      } catch (err) {
        console.error(err);
        alert(`Analysis Error: ${err.message}`);
        setBatteryStep(0);
      }
  };

  const triagePatients = [
    { id: "PT-8832", name: "Arthur P.", age: 72, risk: 0.88, trend: "+0.15", status: "Critical Review", condition: "Parkinson's", lastTest: "2 hrs ago" },
    { id: "PT-5520", name: "Robert K.", age: 81, risk: 0.74, trend: "+0.20", status: "High Risk", condition: "Parkinson's", lastTest: "10 mins ago" },
    { id: "PT-9011", name: "Maria S.", age: 65, risk: 0.65, trend: "+0.05", status: "Moderate", condition: "ALS", lastTest: "1 day ago" },
    { id: "PT-1120", name: "James L.", age: 78, risk: 0.42, trend: "-0.02", status: "Stable", condition: "MCI", lastTest: "3 days ago" },
    { id: "PT-4491", name: "Evelyn T.", age: 69, risk: 0.28, trend: "0.00", status: "Normal", condition: "Baseline", lastTest: "1 week ago" },
  ];

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const renderBatteryUI = () => {
    switch (batteryStep) {
      case 0:
        return (
          <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
            <h2 className="text-2xl font-black text-white mb-4 tracking-wide">INITIALIZE BIOMARKER BATTERY</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm font-mono tracking-wider">Execute sequential vocal exercises to establish a longitudinal baseline for Phonatory Motor Risk.</p>
            <button 
              onClick={() => setBatteryStep(1)}
              className="px-10 py-5 bg-teal-500 hover:bg-teal-400 text-black font-extrabold rounded-full transition-all shadow-[0_0_20px_rgba(45,212,191,0.6)] uppercase tracking-widest text-sm border-2 border-teal-300 pointer-events-auto"
            >
              Engage Clinical Flow
            </button>
          </motion.div>
        );
      case 1:
        return (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
             <div className="flex justify-between items-center text-xs font-mono tracking-widest text-teal-400 border-b border-teal-500/30 pb-2">
               <span>[ SEQ 01 // 02 ] SUSTAINED VOWEL</span>
               <span>T-MINUS 10S</span>
             </div>
             <p className="text-slate-300 text-lg text-center font-light">Take a deep breath and say <strong className="text-teal-400 font-bold">"Ahhhh"</strong> steadily until the timer stops.</p>
             <AudioCapture 
                onRecordingComplete={(blob, isUpload) => handleRecordingComplete(blob, 'vowel', isUpload)} 
                recordingDuration={10} 
                isProcessing={false} 
                label="Start 10s Recording" 
                onAnalyzerReady={setAnalyzer}
                onRecordingStatusChange={setIsRecording}
             />
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
             <div className="flex justify-between items-center text-xs font-mono tracking-widest text-orange-400 border-b border-orange-500/30 pb-2">
               <span>[ SEQ 02 // 02 ] DDK RATE</span>
               <span>T-MINUS 10S</span>
             </div>
             <p className="text-slate-300 text-lg text-center font-light">Say <strong className="text-orange-400 font-bold">"Pa-Ta-Ka"</strong> as quickly and clearly as possible.</p>
             <AudioCapture 
                onRecordingComplete={(blob, isUpload) => handleRecordingComplete(blob, 'ddk', isUpload)} 
                recordingDuration={10} 
                isProcessing={false} 
                label="Start 10s Recording" 
                onAnalyzerReady={setAnalyzer}
                onRecordingStatusChange={setIsRecording}
             />
          </motion.div>
        );
      case 4:
         return (
           <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
             <div className="inline-block relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-slate-700/50"></div>
                <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-teal-500 animate-spin" style={{ animationDuration: '0.8s' }}></div>
                <div className="absolute inset-2 rounded-full border-b-2 border-r-2 border-orange-500 animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}></div>
                <BrainCircuit className="absolute inset-0 m-auto text-white w-6 h-6 animate-pulse" />
             </div>
             <h3 className="text-lg font-mono tracking-widest text-teal-400 uppercase">Extracting Biomarkers</h3>
             <p className="text-slate-500 mt-2 text-xs font-mono tracking-widest uppercase">Processing securely in memory</p>
           </motion.div>
         )
      case 5:
        return (
          <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <h2 className="text-2xl font-black text-white mb-2 tracking-widest uppercase">Battery Complete</h2>
            <p className="text-slate-400 mb-8 font-mono text-sm tracking-wider">Longitudinal baseline synchronized.</p>
            <button 
              onClick={() => { setBatteryStep(0); setAnalysisResult(null); }}
              className="px-8 py-3 backdrop-blur-md bg-black/40 hover:bg-black/60 text-white font-extrabold rounded-full transition-all border border-white/20 uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] pointer-events-auto"
            >
              Initialize New Session
            </button>
          </motion.div>
        )
      default:
        return null;
    }
  }

  return (
    <div className="relative min-h-screen text-slate-100 font-sans overflow-x-hidden bg-black selection:bg-teal-500/30">
      <CustomCursor />
      
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 pointer-events-none mix-blend-difference">
         <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              NEURAL<span className="text-teal-400">ECHO</span>
            </h1>
         </div>
         <div className="flex space-x-3 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            <span>SCROLL TO EXPLORE ↓</span>
         </div>
      </header>


      <Canvas camera={{ position: [0, 2, 10], fov: 60 }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
        <color attach="background" args={['#000000']} />
        
        <ScrollControls pages={6} damping={0.2}>
          <ParticleVortex analyzer={analyzer} isRecording={isRecording} />
          
          <Scroll html style={{ width: '100vw' }}>
            
            {/* STAGE 0: HERO & MISSION */}
            <div className="w-full h-[100vh] flex flex-col justify-center items-center pointer-events-none text-center px-4">
              <span className="backdrop-blur-md bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs font-mono tracking-widest text-teal-400 mb-6 uppercase shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                 NEURALECHO // SMART HEALTH REVOLUTION
              </span>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 max-w-4xl drop-shadow-2xl">
                Your voice changes <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-orange-400">before your symptoms do.</span>
              </h1>
              <p className="text-slate-400 max-w-2xl text-lg md:text-xl font-light mb-12">
                A longitudinal Remote Patient Monitoring (RPM) platform capturing sub-perceptual vocal biomarkers to detect neurodegenerative decline between clinical visits.
              </p>
              <div className="px-8 py-4 backdrop-blur-md bg-black/40 border border-white/20 rounded-full font-bold uppercase tracking-widest text-sm text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                Explore Clinical Intelligence ↓
              </div>
            </div>

            {/* STAGE 1: TARGET DISEASES */}
            <div className="w-full h-[100vh] flex flex-col justify-center px-8 md:px-24 pointer-events-none">
              <div className="max-w-xl">
                 <h2 className="text-4xl md:text-6xl font-black text-white mb-6">The Silent <br/>Progression Gap</h2>
                 <p className="text-slate-400 text-lg mb-8">Over 70% of neurodegenerative degradation occurs invisibly between episodic hospital visits.</p>
                 
                 <div className="space-y-4 pointer-events-auto">
                    <div className="backdrop-blur-xl bg-black/50 border border-white/10 p-6 rounded-2xl shadow-2xl hover:border-teal-500/50 transition-colors cursor-default">
                       <h3 className="text-teal-400 font-bold flex items-center space-x-2 mb-2"><ActivitySquare className="w-5 h-5"/> <span>Parkinson's Disease (PD)</span></h3>
                       <p className="text-slate-300 text-sm">Basal ganglia motor degradation leading to vocal fold micro-tremors, rigidity, and loss of pitch variation.</p>
                    </div>
                    <div className="backdrop-blur-xl bg-black/50 border border-white/10 p-6 rounded-2xl shadow-2xl hover:border-orange-500/50 transition-colors cursor-default">
                       <h3 className="text-orange-400 font-bold flex items-center space-x-2 mb-2"><ActivitySquare className="w-5 h-5"/> <span>Amyotrophic Lateral Sclerosis (ALS)</span></h3>
                       <p className="text-slate-300 text-sm">Rapid bulbar motor neuron loss causing severe articulatory agility decline and dysarthria.</p>
                    </div>
                    <div className="backdrop-blur-xl bg-black/50 border border-white/10 p-6 rounded-2xl shadow-2xl hover:border-white/50 transition-colors cursor-default">
                       <h3 className="text-white font-bold flex items-center space-x-2 mb-2"><BrainCircuit className="w-5 h-5"/> <span>Cognitive Impairment</span></h3>
                       <p className="text-slate-300 text-sm">Prefrontal cortex disconnect manifesting as acoustic hesitation (&gt;500ms pauses) and syntactic flattening.</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* STAGE 2: CLINICAL RISK MATRIX */}
            <div className="w-full h-[100vh] flex flex-col justify-center items-end px-8 md:px-24 pointer-events-none text-right">
              <div className="max-w-2xl">
                 <h2 className="text-4xl md:text-5xl font-black text-white mb-8">Deterministic <br/>Risk Stratification</h2>
                 
                 <div className="space-y-6 pointer-events-auto text-left">
                    <div className="backdrop-blur-xl bg-black/50 border-l-4 border-l-teal-500 border-y border-r border-white/10 p-6 rounded-r-2xl shadow-2xl">
                       <div className="text-teal-400 font-mono tracking-widest text-xs mb-1">[0.00 - 0.29] | NORMAL BASELINE</div>
                       <p className="text-slate-300 text-sm">Patient within expected acoustic baseline variance. No phonatory motor drift.</p>
                    </div>
                    <div className="backdrop-blur-xl bg-black/50 border-l-4 border-l-orange-500 border-y border-r border-white/10 p-6 rounded-r-2xl shadow-2xl">
                       <div className="text-orange-400 font-mono tracking-widest text-xs mb-1">[0.30 - 0.69] | MODERATE RISK</div>
                       <p className="text-slate-300 text-sm">Subtle dysphonia detected. Cepstral Peak Prominence (CPP) dropping below normal thresholds (&lt;10 dB); pitch micro-tremors present.</p>
                    </div>
                    <div className="backdrop-blur-xl bg-black/50 border-l-4 border-l-red-500 border-y border-r border-white/10 p-6 rounded-r-2xl shadow-2xl">
                       <div className="text-red-500 font-mono tracking-widest text-xs mb-1">[0.70 - 1.00] | HIGH RISK</div>
                       <p className="text-slate-300 text-sm">Significant articulatory deceleration and vocal fold tremor. Immediate clinical trial endpoint trigger.</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* STAGE 3: DEFENSIBLE ARCHITECTURE */}
            <div className="w-full h-[100vh] flex flex-col justify-center px-8 md:px-24 pointer-events-none">
              <div className="max-w-2xl">
                 <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Engineered for<br/>Clinical Trust & Compliance</h2>
                 
                 <div className="space-y-6 mb-8 pointer-events-auto">
                    <div className="backdrop-blur-xl bg-black/50 border border-white/10 p-6 rounded-2xl shadow-2xl flex items-start space-x-4">
                       <Server className="w-8 h-8 text-teal-400 flex-shrink-0" />
                       <div>
                         <h3 className="text-white font-bold mb-1">Ephemeral In-Memory Processing</h3>
                         <p className="text-slate-400 text-sm">100% RAM-only audio processing (io.BytesIO) — zero disk storage for biometric privacy.</p>
                       </div>
                    </div>
                    <div className="backdrop-blur-xl bg-black/50 border border-white/10 p-6 rounded-2xl shadow-2xl flex items-start space-x-4">
                       <Microchip className="w-8 h-8 text-orange-400 flex-shrink-0" />
                       <div>
                         <h3 className="text-white font-bold mb-1">Deterministic ML Core</h3>
                         <p className="text-slate-400 text-sm">Scikit-learn FNN trained on balanced acoustic corpora (SMOTE + SelectKBest).</p>
                       </div>
                    </div>
                    <div className="backdrop-blur-xl bg-black/50 border border-white/10 p-6 rounded-2xl shadow-2xl flex items-start space-x-4">
                       <BrainCircuit className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                       <div>
                         <h3 className="text-white font-bold mb-1">Sandboxed Downstream LLM</h3>
                         <p className="text-slate-400 text-sm">LangGraph + Google Gemini generating standardized medical SOAP notes without hallucinating diagnostic scores.</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-wrap gap-2 pointer-events-auto">
                    {['Python', 'FastAPI', 'praat-parselmouth', 'scikit-learn', 'LangGraph', 'Gemini 3.6 Flash', 'React', 'Three.js', 'Web Audio API'].map(tech => (
                      <span key={tech} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-slate-300 shadow-xl">{tech}</span>
                    ))}
                 </div>
              </div>
            </div>

            {/* STAGE 4: CLINICAL WORKSTATION (The Dashboard) */}
            <div className="w-full min-h-[100vh] flex flex-col justify-center p-8 max-w-[1600px] mx-auto pointer-events-auto">
                <div className="flex justify-center mb-8 space-x-4">
                  <button onClick={() => setDashboardMode('patient')} className={`px-6 py-2 rounded-full font-mono text-xs tracking-widest uppercase transition-all ${dashboardMode === 'patient' ? 'bg-teal-500 text-black shadow-[0_0_15px_rgba(45,212,191,0.5)]' : 'bg-black/40 border border-white/20 text-slate-400 hover:text-white'}`}>Single Patient View</button>
                  <button onClick={() => setDashboardMode('triage')} className={`px-6 py-2 rounded-full font-mono text-xs tracking-widest uppercase transition-all ${dashboardMode === 'triage' ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-black/40 border border-white/20 text-slate-400 hover:text-white'}`}>Clinician Fleet Triage</button>
                </div>
                
                {dashboardMode === 'patient' ? (
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full"
                >
                  {/* Left Column: Capture & Longitudinal Telemetry */}
                  <motion.div variants={fadeUp} className="xl:col-span-4 space-y-6">
                    <div className="backdrop-blur-xl bg-black/40 p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] min-h-[400px] flex flex-col justify-center relative overflow-hidden">
                       <AnimatePresence mode="wait">
                         {renderBatteryUI()}
                       </AnimatePresence>
                    </div>

                    <div className="backdrop-blur-xl bg-black/40 p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-sm font-mono tracking-widest uppercase text-white">Longitudinal Telemetry</h2>
                        <Activity className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="h-40 flex items-end justify-between px-2 pb-2 border-l border-b border-white/10 relative">
                         {mockPastData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center group relative w-1/5 cursor-crosshair">
                              <div 
                                className="w-full bg-white/10 rounded-t-md group-hover:bg-teal-500/80 transition-all duration-300 relative overflow-hidden" 
                                style={{ height: `${d.risk * 100}%` }}
                              >
                                 <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"></div>
                              </div>
                              <span className="text-[10px] font-mono tracking-widest text-slate-500 mt-3">{d.visit}</span>
                              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-teal-500/50 p-2 rounded text-[10px] font-mono text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.3)] whitespace-nowrap z-20 pointer-events-none">
                                Risk: {d.risk.toFixed(2)}
                              </div>
                            </div>
                         ))}
                         {analysisResult && (
                           <div className="flex flex-col items-center group relative w-1/5">
                              <div 
                                className="w-full bg-orange-500 rounded-t-md relative overflow-hidden shadow-[0_0_15px_rgba(249,115,22,0.6)]" 
                                style={{ height: `${analysisResult.risk_scores.phonatory_motor * 100}%` }}
                              >
                                 <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
                              </div>
                              <span className="text-[10px] font-mono tracking-widest text-orange-400 font-bold mt-3">NOW</span>
                              <div className="absolute -top-12 bg-orange-950 border border-orange-500 p-2 rounded text-[10px] font-mono text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.5)] whitespace-nowrap z-20 pointer-events-none">
                                Risk: {analysisResult.risk_scores.phonatory_motor.toFixed(2)}
                              </div>
                            </div>
                         )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Right Column: Clinical Analysis & Terminal */}
                  <motion.div variants={fadeUp} className="xl:col-span-8 space-y-6">
                    {analysisResult ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-6">
                        {/* Scorecards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-1 backdrop-blur-xl bg-black/40 p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col justify-center items-center">
                            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none
                              ${analysisResult.risk_scores.phonatory_motor > 0.7 ? 'bg-red-500' : analysisResult.risk_scores.phonatory_motor > 0.4 ? 'bg-orange-500' : 'bg-teal-500'}`}>
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-mono uppercase tracking-[0.2em] mb-4 text-center">Phonatory Motor Risk</h3>
                            <div className="relative flex items-center justify-center w-32 h-32">
                               <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                 <circle 
                                    cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                    strokeDasharray="364.4" 
                                    strokeDashoffset={364.4 - (364.4 * analysisResult.risk_scores.phonatory_motor)}
                                    className={`transition-all duration-1000 ease-out 
                                      ${analysisResult.risk_scores.phonatory_motor > 0.7 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 
                                        analysisResult.risk_scores.phonatory_motor > 0.4 ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 
                                        'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]'}`}
                                  />
                               </svg>
                               <div className="text-4xl font-black font-sans tracking-tighter text-white">
                                {analysisResult.risk_scores.phonatory_motor.toFixed(2)}
                              </div>
                            </div>
                            
                            <div className="w-full mt-6 space-y-2 relative z-10">
                                <div className="flex justify-between text-[8px] font-mono uppercase text-slate-400">
                                    <span>CPP Variance Weight</span>
                                    <span className="text-teal-400">68%</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 w-[68%]"></div>
                                </div>
                                <div className="flex justify-between text-[8px] font-mono uppercase text-slate-400 mt-2">
                                    <span>F0 Instability Weight</span>
                                    <span className="text-orange-400">32%</span>
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 w-[32%]"></div>
                                </div>
                                <div className="text-[9px] font-mono text-center text-slate-500 mt-3 border-t border-white/10 pt-2">
                                   Scikit-Learn ML Deterministic Trace
                                </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 grid grid-cols-2 gap-6">
                            <div className="backdrop-blur-xl bg-black/40 p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex flex-col justify-center">
                              <h3 className="text-slate-400 text-[10px] font-mono uppercase tracking-[0.2em] mb-2">CPP (dB)</h3>
                              <div className="text-3xl font-bold text-white font-sans tracking-tight">{analysisResult.biomarkers.CPP.toFixed(2)}</div>
                            </div>
                            <div className="backdrop-blur-xl bg-black/40 p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex flex-col justify-center">
                              <h3 className="text-slate-400 text-[10px] font-mono uppercase tracking-[0.2em] mb-2">Mean F0 (Hz)</h3>
                              <div className="text-3xl font-bold text-white font-sans tracking-tight">{analysisResult.biomarkers.F0.toFixed(1)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Medical Terminal SOAP Note */}
                        <div className="backdrop-blur-xl bg-black/40 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.7)] overflow-hidden flex flex-col">
                          <div className="bg-white/5 border-b border-white/10 px-6 py-3 flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <Terminal className="w-4 h-4 text-teal-400" />
                              <h2 className="text-[10px] font-mono tracking-widest text-slate-300 uppercase">Secure Clinical Console</h2>
                            </div>
                            <span className="bg-teal-500/10 text-teal-300 text-[9px] px-2 py-1 rounded border border-teal-500/30 font-mono tracking-widest uppercase flex items-center">
                              <div className="w-1 h-1 rounded-full bg-teal-400 mr-2 animate-pulse"></div>
                              LangGraph Synthesized
                            </span>
                          </div>
                          <div className="p-6 relative">
                            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 z-10"></div>
                            <div className="font-mono text-xs md:text-sm text-teal-50 shadow-inner leading-relaxed whitespace-pre-wrap h-[220px] overflow-y-auto custom-scrollbar relative z-20">
                              {analysisResult.soap_note}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div variants={fadeUp} className="h-full min-h-[400px] flex flex-col items-center justify-center backdrop-blur-md bg-black/20 rounded-3xl border border-white/5 p-12 text-center shadow-inner relative overflow-hidden group">
                         <div className="absolute w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[100px] group-hover:bg-teal-500/10 transition-colors duration-1000"></div>
                         <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center mb-8 relative z-10 backdrop-blur-xl bg-black/40 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                           <Activity className="w-10 h-10 text-slate-500 group-hover:text-teal-400 transition-colors duration-500" />
                         </div>
                         <h3 className="text-xl font-mono tracking-[0.2em] uppercase text-white mb-4 relative z-10">Awaiting Telemetry</h3>
                         <p className="text-slate-500 max-w-md text-sm font-mono tracking-widest uppercase leading-relaxed relative z-10">
                           Initiate the guided recording sequence to extract diagnostic acoustic signatures and synthesize clinical assessment.
                         </p>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
                ) : (
                  <motion.div variants={fadeUp} initial="hidden" animate="show" className="w-full max-w-5xl mx-auto backdrop-blur-xl bg-black/40 p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                     <div className="flex justify-between items-center mb-8">
                        <div>
                           <h2 className="text-xl font-mono tracking-widest uppercase text-white">Fleet Risk Triage</h2>
                           <p className="text-slate-500 text-xs font-mono mt-1">Live active monitoring across 1,204 registered patients</p>
                        </div>
                        <div className="flex items-center space-x-2 text-xs font-mono text-teal-400 border border-teal-500/30 bg-teal-500/10 px-3 py-1 rounded">
                           <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                           <span>Live Sync Active</span>
                        </div>
                     </div>
                     
                     <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        <table className="w-full text-left font-mono text-sm">
                           <thead className="bg-white/5 text-slate-400 text-xs">
                              <tr>
                                 <th className="p-4 font-normal">Patient ID</th>
                                 <th className="p-4 font-normal">Condition</th>
                                 <th className="p-4 font-normal">Last Test</th>
                                 <th className="p-4 font-normal text-right">Risk Score</th>
                                 <th className="p-4 font-normal text-right">Trend</th>
                                 <th className="p-4 font-normal text-center">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/10 text-slate-200">
                              {triagePatients.map((p, i) => (
                                 <tr key={i} className="hover:bg-white/5 transition-colors cursor-pointer">
                                    <td className="p-4 text-white font-bold">{p.id} <span className="block text-slate-500 text-[10px] font-normal">{p.name}</span></td>
                                    <td className="p-4 text-slate-400">{p.condition}</td>
                                    <td className="p-4 text-slate-400">{p.lastTest}</td>
                                    <td className="p-4 text-right font-bold text-white">{p.risk.toFixed(2)}</td>
                                    <td className={`p-4 text-right ${p.trend.startsWith('+') ? 'text-red-400' : 'text-teal-400'}`}>{p.trend}</td>
                                    <td className="p-4 text-center">
                                       <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest border ${p.risk > 0.7 ? 'bg-red-500/20 text-red-400 border-red-500/30' : p.risk > 0.4 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-teal-500/20 text-teal-400 border-teal-500/30'}`}>
                                          {p.status}
                                       </span>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </motion.div>
                )}
                
                {/* CRAZY FOOTER */}
                <motion.div 
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 1, type: "spring", bounce: 0.5 }}
                  viewport={{ once: false }}
                  className="w-full mt-32 pt-24 pb-48 flex flex-col justify-center items-center text-center border-t border-white/10 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-500/10 via-orange-500/5 to-transparent pointer-events-none blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000"></div>
                  
                  <h2 className="text-slate-500 font-mono text-2xl md:text-4xl tracking-[0.4em] uppercase mb-8 font-light relative z-10">
                    Engineered by
                    <span className="block mt-6 text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-500 to-orange-400 drop-shadow-[0_0_40px_rgba(45,212,191,0.6)] animate-pulse hover:scale-110 hover:drop-shadow-[0_0_80px_rgba(45,212,191,1)] transition-all duration-500 cursor-crosshair">
                      TEAM ECHO
                    </span>
                  </h2>
                  
                  <div className="flex flex-wrap justify-center gap-6 mt-12 relative z-10">
                     {['Snehith', 'Jishnu', 'Adarsh Wesly'].map((name, i) => (
                       <span key={i} className="px-8 py-3 rounded-full border border-white/20 bg-black/60 backdrop-blur-xl text-white font-mono tracking-[0.2em] uppercase text-sm md:text-xl shadow-2xl hover:border-orange-400 hover:text-orange-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:-translate-y-2 transition-all duration-300 cursor-pointer">
                          {name}
                       </span>
                     ))}
                  </div>
                </motion.div>
            </div>
          </Scroll>
        </ScrollControls>
        
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={2.0} mipmapBlur />
        </EffectComposer>
      </Canvas>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(45,212,191,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(45,212,191,0.5); }
      `}} />
    </div>
  );
}

export default App;
