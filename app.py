# app.py
from flask import Flask, request, jsonify
import base64
import cv2
import numpy as np
import joblib

app = Flask(__name__)
model = joblib.load("hackAIModelWithDifferentModel.pkl")

def decode_base64_image(data):
    encoded_data = data.split(',')[1]
    nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def extract_features(img):
    return img.mean(axis=(0, 1))  # example: mean color features

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    img_b64 = data.get("image")
    frame = decode_base64_image(img_b64)

    features = extract_features(frame)
    prediction = model.predict([features])[0]

    return jsonify({"prediction": str(prediction)})

if __name__ == "__main__":
    app.run(debug=True)
