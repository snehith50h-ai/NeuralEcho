import requests

url = "https://neuralecho-fq2x.onrender.com/api/analyze-voice"
file_path = "c:/demux/neuralecho/backend/test.wav"

try:
    with open(file_path, "rb") as f:
        files = {"file": ("test.wav", f, "audio/wav")}
        response = requests.post(url, files=files, data={"test_type": "aggregated"})
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
