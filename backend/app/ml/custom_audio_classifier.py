import os

import joblib
import librosa
import numpy as np


MODEL_PATH = "/app/audio_dataset/processed/wildlife_audio_classifier.joblib"

model = joblib.load(MODEL_PATH)


def extract_features(audio_path: str, start_time: float):
    """
    Extract the same 40 MFCC features used during training.

    Training:
    - 16 kHz
    - mono
    - 3-second window
    - 20 MFCCs
    - mean + standard deviation
    """

    y, sr = librosa.load(
        audio_path,
        sr=16000,
        mono=True,
        offset=max(0, float(start_time)),
        duration=3.0,
    )

    if len(y) < sr:
        y = np.pad(y, (0, sr - len(y)))

    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=20,
    )

    features = np.concatenate([
        np.mean(mfcc, axis=1),
        np.std(mfcc, axis=1),
    ])

    return features.reshape(1, -1)


def classify_audio_segment(
    audio_path: str,
    start_time: float,
):
    """
    Classify a 3-second audio segment using
    the trained Random Forest model.
    """

    features = extract_features(
        audio_path,
        start_time,
    )

    prediction = model.predict(features)[0]

    probabilities = model.predict_proba(features)[0]

    confidence = float(
        np.max(probabilities)
    )

    return {
        "species": str(prediction),
        "confidence": confidence,
    }