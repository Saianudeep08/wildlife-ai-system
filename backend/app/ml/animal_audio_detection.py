import os

import joblib
import librosa
import numpy as np
import soundfile as sf


MODEL_PATH = (
    "/app/animal_audio_dataset/processed/"
    "animal_audio_classifier.joblib"
)

SAMPLE_RATE = 22050
MAX_DURATION = 10
N_MFCC = 40


# Load the trained model once when the module starts.
model_package = joblib.load(MODEL_PATH)

model = model_package["model"]
label_encoder = model_package["label_encoder"]


def audio_log(message):
    print(f"AUDIO MODEL: {message}", flush=True)


def resample_audio(y, original_sr, target_sr):
    """Lightweight linear resampling without librosa's resampler/numba path."""
    if original_sr == target_sr:
        return y

    target_length = max(1, int(round(len(y) * target_sr / original_sr)))
    old_positions = np.linspace(0.0, 1.0, num=len(y), endpoint=False)
    new_positions = np.linspace(0.0, 1.0, num=target_length, endpoint=False)
    return np.interp(new_positions, old_positions, y).astype(np.float32)


def extract_features(file_path):
    """
    Extract the same 88 features used during training.
    """

    audio_log("soundfile.read started")
    y, sr = sf.read(file_path, dtype="float32", always_2d=False)
    audio_log(f"soundfile.read finished: {len(y)} samples at {sr} Hz")

    if len(y) == 0:
        raise ValueError("Audio file contains no usable audio data.")

    if y.ndim > 1:
        y = np.mean(y, axis=1)

    max_samples = int(MAX_DURATION * sr)
    if len(y) > max_samples:
        y = y[:max_samples]

    if sr != SAMPLE_RATE:
        audio_log(f"lightweight resampling started: {sr} -> {SAMPLE_RATE} Hz")
        y = resample_audio(y, sr, SAMPLE_RATE)
        sr = SAMPLE_RATE
        audio_log(f"lightweight resampling finished: {len(y)} samples at {sr} Hz")

    audio_log("MFCC extraction started")
    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=N_MFCC,
    )
    audio_log("MFCC extraction finished")

    mfcc_mean = np.mean(mfcc, axis=1)
    mfcc_std = np.std(mfcc, axis=1)

    audio_log("spectral feature extraction started")
    spectral_centroid = librosa.feature.spectral_centroid(
        y=y,
        sr=sr,
    )

    spectral_bandwidth = librosa.feature.spectral_bandwidth(
        y=y,
        sr=sr,
    )

    spectral_rolloff = librosa.feature.spectral_rolloff(
        y=y,
        sr=sr,
    )

    zero_crossing_rate = librosa.feature.zero_crossing_rate(y)
    audio_log("spectral feature extraction finished")

    features = np.concatenate([
        mfcc_mean,
        mfcc_std,
        [
            np.mean(spectral_centroid),
            np.std(spectral_centroid),
            np.mean(spectral_bandwidth),
            np.std(spectral_bandwidth),
            np.mean(spectral_rolloff),
            np.std(spectral_rolloff),
            np.mean(zero_crossing_rate),
            np.std(zero_crossing_rate),
        ],
    ])

    audio_log(f"feature vector created: {features.shape}")
    return features


def analyze_animal_audio(file_path):
    """
    Predict the animal class from an audio recording.
    """

    features = extract_features(file_path)

    features = features.reshape(1, -1)
    audio_log("predict_proba started")

    probabilities = model.predict_proba(features)[0]
    audio_log("predict_proba finished")

    prediction_index = int(
        np.argmax(probabilities)
    )

    predicted_class = label_encoder.inverse_transform(
        [prediction_index]
    )[0]

    confidence = float(
        probabilities[prediction_index]
    )

    class_probabilities = {}

    for index, class_name in enumerate(
        label_encoder.classes
    ):
        class_probabilities[str(class_name)] = round(
            float(probabilities[index]),
            4,
        )

    audio_log(
        f"prediction ready: animal={predicted_class}, confidence={confidence:.4f}"
    )

    return {
        "animal": str(predicted_class),
        "confidence": confidence,
        "class_probabilities": class_probabilities,
    }
