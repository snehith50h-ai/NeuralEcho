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
from sklearn.neural_network import MLPClassifier  # type: ignore
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

def setup_clinical_pipeline():
    """
    Trains the FNN pipeline mimicking the Nature paper approach on startup.
    Uses a synthetic dataset of healthy vs. PD biomarkers to demonstrate the architecture.
    """
    print("Initializing Clinical ML Pipeline (SMOTE + SelectKBest + FNN)...")
    np.random.seed(42)
    
    # 1. Generate synthetic dataset simulating the UCI dataset distribution
    # Features: [CPP, F0, Noise1, Noise2, Noise3]
    # PD patients typically have lower CPP (e.g. 8-13) and more F0 variance.
    # Healthy controls typically have higher CPP (e.g. 14-25).
    
    # Generate 150 PD samples (75% of dataset)
    pd_cpp = np.random.normal(10.0, 2.0, 150)
    pd_f0 = np.random.normal(130.0, 20.0, 150)
    pd_noise = np.random.normal(0, 1, (150, 3))
    pd_X = np.column_stack((pd_cpp, pd_f0, pd_noise))
    pd_y = np.ones(150) # 1 = PD
    
    # Generate 50 Healthy samples (25% of dataset)
    hc_cpp = np.random.normal(18.0, 2.5, 50)
    hc_f0 = np.random.normal(120.0, 10.0, 50)
    hc_noise = np.random.normal(0, 1, (50, 3))
    hc_X = np.column_stack((hc_cpp, hc_f0, hc_noise))
    hc_y = np.zeros(50) # 0 = Healthy
    
    X = np.vstack((pd_X, hc_X))
    y = np.concatenate((pd_y, hc_y))
    
    # 2. Build Pipeline
    # Using imblearn.pipeline.Pipeline so SMOTE is only applied during fit
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('smote', SMOTE(random_state=42)),
        ('feature_selection', SelectKBest(score_func=f_classif, k=2)), # Select top 2 predictive features (CPP, F0)
        ('classifier', MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=500, random_state=42, early_stopping=True))
    ])
    
    # 3. Train
    pipeline.fit(X, y)
    print("Clinical ML Pipeline ready.")
    return pipeline

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
