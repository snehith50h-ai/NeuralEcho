import React, { useState, useRef } from 'react';

// Utility to convert AudioBuffer to WAV format
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export default function AudioCapture({ onRecordingComplete, recordingDuration, isProcessing, label, onAnalyzerReady, onRecordingStatusChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: false
        }
      });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      
      // Pass the analyzer to the parent so the 3D vortex can react
      if (onAnalyzerReady) {
          onAnalyzerReady(analyzerRef.current);
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
        }
        setIsRecording(false);
        if (onRecordingStatusChange) onRecordingStatusChange(false);
        
        // Disconnect analyzer
        if (onAnalyzerReady) onAnalyzerReady(null);
        
        try {
          const arrayBuffer = await webmBlob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBlob = audioBufferToWav(audioBuffer);
          
          onRecordingComplete(wavBlob, false);
        } catch (error) {
          console.error("Analysis failed", error);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      if (onRecordingStatusChange) onRecordingStatusChange(true);
      
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, recordingDuration * 1000);

    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      clearTimeout(timerRef.current);
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {!isRecording && !isProcessing && (
        <div className="w-full flex space-x-4">
          <button 
            onClick={startRecording}
            className="flex-1 py-4 bg-teal-500 hover:bg-teal-400 text-black font-extrabold rounded-full transition-all shadow-[0_0_20px_rgba(45,212,191,0.6)] uppercase tracking-wider text-sm border-2 border-teal-400"
          >
            {label}
          </button>
          
          <label className="flex-1 py-4 backdrop-blur-md bg-black/40 hover:bg-black/60 text-orange-400 font-extrabold rounded-full transition-all border-2 border-orange-500/50 flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] uppercase tracking-wider text-sm">
            <span>Upload File</span>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onRecordingComplete(e.target.files[0], true);
                }
              }} 
            />
          </label>
        </div>
      )}

      {isRecording && (
        <button 
          onClick={stopRecording}
          className="w-full py-4 bg-red-500 hover:bg-red-400 text-white font-extrabold rounded-full transition-all shadow-[0_0_25px_rgba(239,68,68,0.7)] uppercase tracking-wider text-sm animate-pulse border-2 border-red-400"
        >
          Stop Recording Early
        </button>
      )}

      {isProcessing && (
        <button 
          disabled
          className="w-full py-4 backdrop-blur-md bg-black/40 text-teal-400 font-extrabold rounded-full flex items-center justify-center space-x-3 cursor-not-allowed border-2 border-teal-500/30 uppercase tracking-widest text-sm"
        >
          <svg className="animate-spin -ml-1 h-5 w-5 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Analyzing Signature...</span>
        </button>
      )}
    </div>
  );
}
