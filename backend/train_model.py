import os
import glob
import numpy as np

import joblib
from imblearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import classification_report, confusion_matrix
from main import extract_features

def load_data(data_dir):
    print("Extracting features from audio files...")
    features = []
    labels = []
    
    # Healthy (HC)
    hc_files = glob.glob(os.path.join(data_dir, "hc", "**", "*.wav"), recursive=True)
    print(f"Found {len(hc_files)} healthy files.")
    for file in hc_files:
        try:
            with open(file, "rb") as f:
                audio_bytes = f.read()
            biomarkers = extract_features(audio_bytes)
            # Match the 5-feature format used in main.py: [CPP, F0, 0, 0, 0]
            features.append([biomarkers["CPP"], biomarkers["F0"], 0.0, 0.0, 0.0])
            labels.append(0) # 0 = Healthy
        except Exception as e:
            print(f"Error processing {file}: {e}")
            
    # Parkinson's (PD)
    pd_files = glob.glob(os.path.join(data_dir, "pd", "**", "*.wav"), recursive=True)
    print(f"Found {len(pd_files)} PD files.")
    for file in pd_files:
        try:
            with open(file, "rb") as f:
                audio_bytes = f.read()
            biomarkers = extract_features(audio_bytes)
            features.append([biomarkers["CPP"], biomarkers["F0"], 0.0, 0.0, 0.0])
            labels.append(1) # 1 = PD
        except Exception as e:
            print(f"Error processing {file}: {e}")
            
    return np.array(features), np.array(labels)

def train_and_save_model():
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    X, y = load_data(data_dir)
    
    if len(X) == 0:
        print("No valid audio files found. Aborting.")
        return
        
    print(f"Successfully loaded {len(X)} samples ({sum(y==0)} HC, {sum(y==1)} PD).")
    
    # We will use RandomForest without SMOTE as the real dataset might be unbalanced but RF can handle it with class_weight='balanced'
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42))
    ])
    
    print("\n--- Evaluating Model with 5-Fold Cross Validation ---")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    y_pred = cross_val_predict(pipeline, X, y, cv=cv)
    
    print(classification_report(y, y_pred, target_names=['Healthy', 'PD']))
    print("Confusion Matrix:")
    print(confusion_matrix(y, y_pred))
    
    print("\n--- Training Final Model on All Data ---")
    pipeline.fit(X, y)
    
    model_path = os.path.join(os.path.dirname(__file__), "clinical_model.pkl")
    joblib.dump(pipeline, model_path)
    print(f"Model successfully saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()
