from fastapi import FastAPI, File, UploadFile, Form, HTTPException  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import io
import numpy as np  # type: ignore
from scipy.io import wavfile  # type: ignore
import parselmouth  # type: ignore
from typing import Dict
from dotenv import load_dotenv  # type: ignore

load_dotenv()

# NEW ML Pipeline imports mimicking the Nature Paper Architecture
from imblearn.pipeline import Pipeline  # type: ignore
from imblearn.over_sampling import SMOTE  # type: ignore
from sklearn.feature_selection import SelectKBest, f_classif  # type: ignore
from sklearn.linear_model import LogisticRegression  # type: ignore
from sklearn.preprocessing import StandardScaler  # type: ignore

from llm.graph import generate_soap_note

app = FastAPI(title="NeuralEcho API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "NeuralEcho Backend is Live!"}

# Global model pipeline
clinical_pipeline = None

import joblib
import os

def setup_clinical_pipeline():
    """
    Loads the trained clinical model from disk.
    """
    print("Loading Clinical ML Pipeline...")
    model_path = os.path.join(os.path.dirname(__file__), "clinical_model.pkl")
    if os.path.exists(model_path):
        pipeline = joblib.load(model_path)
        print("Clinical ML Pipeline loaded successfully.")
        return pipeline
    else:
        raise RuntimeError(f"Model file not found at {model_path}. Please run train_model.py first.")

@app.on_event("startup")
def startup_event():
    global clinical_pipeline
    clinical_pipeline = setup_clinical_pipeline()

def extract_features(audio_bytes: bytes) -> Dict[str, float]:
    """
    Extract vocal biomarkers securely in RAM using Parselmouth.
    """
    file_like = io.BytesIO(audio_bytes)
    try:
        sample_rate, data = wavfile.read(file_like)
        if len(data.shape) > 1:
            data = data[:, 0]
        if data.dtype != np.float32 and data.dtype != np.float64:
            data = data.astype(np.float32) / np.iinfo(data.dtype).max
            
        rms = np.sqrt(np.mean(data**2))
        peak = np.max(np.abs(data))
        if rms < 0.005:
            raise ValueError("AUDIO_QUALITY_GATE_FAILED: Signal too quiet. Please speak louder.")
        if peak >= 0.99 and rms > 0.3:
            raise ValueError("AUDIO_QUALITY_GATE_FAILED: Signal clipping detected. Please move slightly away from the microphone.")
            
        sound = parselmouth.Sound(data, sample_rate)
        
        pitch = sound.to_pitch()
        f0_values = pitch.selected_array['frequency']
        f0_values = f0_values[f0_values > 0]
        mean_f0 = float(np.mean(f0_values)) if len(f0_values) > 0 else 120.0
        
        try:
            cepstrogram = parselmouth.praat.call(sound, 'To PowerCepstrogram', 60, 0.002, 5000, 50)
            cpps = parselmouth.praat.call(cepstrogram, 'Get CPPS', 'yes', 0.01, 0.001, 60.0, 330.0, 0.05, 'Parabolic', 0.001, 0.0, 'Straight', 'Robust')
        except Exception:
            cpps = 14.5
        
        return {
            "CPP": float(cpps) if not np.isnan(cpps) else 14.5,
            "F0": mean_f0 if not np.isnan(mean_f0) else 120.0
        }
    except ValueError as ve:
        if "AUDIO_QUALITY_GATE_FAILED" in str(ve):
            raise ve
        print(f"Error parsing audio: {ve}")
        return {"CPP": 14.5, "F0": 120.0}
    except Exception as e:
        print(f"Error parsing audio: {e}")
        return {
            "CPP": 14.5,
            "F0": 120.0
        }

@app.post("/api/analyze-voice")
async def analyze_voice(file: UploadFile = File(...), test_type: str = Form("sustained_ah")):
    audio_bytes = await file.read()
    
    try:
        biomarkers = extract_features(audio_bytes)
    except ValueError as e:
        if "AUDIO_QUALITY_GATE_FAILED" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        raise e
    
    # ML Pipeline Risk Scoring (Nature Paper Architecture)
    # Format the input features specifically as [CPP, F0, Noise1, Noise2, Noise3] 
    # to match the pipeline's expected 5 features (2 signal, 3 noise).
    input_features = np.array([[biomarkers["CPP"], biomarkers["F0"], 0.0, 0.0, 0.0]])
    
    # The pipeline outputs probabilities [prob_healthy, prob_pd]
    probabilities = clinical_pipeline.predict_proba(input_features)[0]
    phonatory_motor = float(probabilities[1]) # Probability of PD
    
    soap_note = generate_soap_note(phonatory_motor, biomarkers, test_type)
    
    return {
        "risk_scores": {
            "phonatory_motor": round(phonatory_motor, 2)
        },
        "biomarkers": biomarkers,
        "soap_note": soap_note
    }

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
