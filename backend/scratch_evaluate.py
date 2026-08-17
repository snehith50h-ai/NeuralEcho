import numpy as np
from imblearn.pipeline import Pipeline
from imblearn.over_sampling import SMOTE
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

np.random.seed(42)

# Generate synthetic dataset
pd_cpp = np.random.normal(10.0, 2.0, 150)
pd_f0 = np.random.normal(130.0, 20.0, 150)
pd_noise = np.random.normal(0, 1, (150, 3))
pd_X = np.column_stack((pd_cpp, pd_f0, pd_noise))
pd_y = np.ones(150)

hc_cpp = np.random.normal(18.0, 2.5, 50)
hc_f0 = np.random.normal(120.0, 10.0, 50)
hc_noise = np.random.normal(0, 1, (50, 3))
hc_X = np.column_stack((hc_cpp, hc_f0, hc_noise))
hc_y = np.zeros(50)

X = np.vstack((pd_X, hc_X))
y = np.concatenate((pd_y, hc_y))

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('smote', SMOTE(random_state=42)),
    ('feature_selection', SelectKBest(score_func=f_classif, k=2)),
    ('classifier', MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=500, random_state=42, early_stopping=True))
])

pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)
print("--- MLP Classifier ---")
print(classification_report(y_test, y_pred))
print(confusion_matrix(y_test, y_pred))

# Let's try Logistic Regression or Random Forest
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

pipe_rf = Pipeline([
    ('scaler', StandardScaler()),
    ('smote', SMOTE(random_state=42)),
    ('feature_selection', SelectKBest(score_func=f_classif, k=2)),
    ('classifier', RandomForestClassifier(random_state=42))
])
pipe_rf.fit(X_train, y_train)
y_pred_rf = pipe_rf.predict(X_test)
print("\n--- Random Forest ---")
print(classification_report(y_test, y_pred_rf))

pipe_lr = Pipeline([
    ('scaler', StandardScaler()),
    ('smote', SMOTE(random_state=42)),
    ('feature_selection', SelectKBest(score_func=f_classif, k=2)),
    ('classifier', LogisticRegression(random_state=42))
])
pipe_lr.fit(X_train, y_train)
y_pred_lr = pipe_lr.predict(X_test)
print("\n--- Logistic Regression ---")
print(classification_report(y_test, y_pred_lr))

# Let's see feature importances and scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print("\n--- Data ranges after scaling ---")
print(f"Mean: {np.mean(X_scaled, axis=0)}")
print(f"Std: {np.std(X_scaled, axis=0)}")

# Check what the model outputs for a healthy person: CPP 18, F0 120
healthy_sample = np.array([[18.0, 120.0, 0.0, 0.0, 0.0]])
print(f"\nPrediction for healthy: {pipeline.predict_proba(healthy_sample)}")
