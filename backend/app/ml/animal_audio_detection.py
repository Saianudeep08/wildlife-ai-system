import os

import joblib
import numpy as np
import soundfile as sf


MODEL_PATH = (
    "/app/animal_audio_dataset/processed/"
    "animal_audio_classifier.joblib"
)

SAMPLE_RATE = 22050
MAX_DURATION = 10
N_MFCC = 40
N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512


# Load the trained model once when the module starts.
model_package = joblib.load(MODEL_PATH)

model = model_package["model"]
label_encoder = model_package["label_encoder"]


def audio_log(message):
    print(f"AUDIO MODEL: {message}", flush=True)


def resample_audio(y, original_sr, target_sr):
    """Lightweight linear resampling without librosa/numba."""
    if original_sr == target_sr:
        return y

    target_length = max(1, int(round(len(y) * target_sr / original_sr)))
    old_positions = np.linspace(0.0, 1.0, num=len(y), endpoint=False)
    new_positions = np.linspace(0.0, 1.0, num=target_length, endpoint=False)
    return np.interp(new_positions, old_positions, y).astype(np.float32)


def frame_signal(y, frame_length=N_FFT, hop_length=HOP_LENGTH):
    """Create centered, Hann-windowed frames similar to librosa defaults."""
    pad = frame_length // 2
    padded = np.pad(y, (pad, pad), mode="constant")

    if len(padded) < frame_length:
        padded = np.pad(padded, (0, frame_length - len(padded)))

    frame_count = 1 + max(0, (len(padded) - frame_length) // hop_length)
    indices = (
        np.arange(frame_length)[None, :]
        + hop_length * np.arange(frame_count)[:, None]
    )
    frames = padded[indices]
    window = np.hanning(frame_length).astype(np.float32)
    return frames.astype(np.float32) * window


def hz_to_mel(hz):
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def mel_to_hz(mel):
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


def mel_filterbank(sr, n_fft, n_mels):
    """Build a Slaney-style normalized mel filter bank with NumPy only."""
    fmin = 0.0
    fmax = sr / 2.0

    mel_points = np.linspace(
        hz_to_mel(fmin),
        hz_to_mel(fmax),
        n_mels + 2,
    )
    hz_points = mel_to_hz(mel_points)
    bins = np.floor((n_fft + 1) * hz_points / sr).astype(int)
    bins = np.clip(bins, 0, n_fft // 2)

    filters = np.zeros((n_mels, n_fft // 2 + 1), dtype=np.float32)

    for m in range(n_mels):
        left, center, right = bins[m], bins[m + 1], bins[m + 2]

        if center > left:
            filters[m, left:center] = (
                np.arange(left, center) - left
            ) / float(center - left)

        if right > center:
            filters[m, center:right] = (
                right - np.arange(center, right)
            ) / float(right - center)

        # Slaney-style area normalization.
        enorm = 2.0 / max(1e-12, hz_points[m + 2] - hz_points[m])
        filters[m] *= enorm

    return filters


def dct_type_ii_orthonormal(matrix, n_components):
    """Apply an orthonormal DCT-II along the mel-frequency axis."""
    n = matrix.shape[1]
    k = np.arange(n_components)[:, None]
    indices = np.arange(n)[None, :]
    basis = np.cos(np.pi / n * (indices + 0.5) * k).astype(np.float32)
    basis[0] *= np.sqrt(1.0 / n)
    if n_components > 1:
        basis[1:] *= np.sqrt(2.0 / n)
    return matrix @ basis.T


def spectral_features_from_frames(power, sr):
    """Calculate centroid, bandwidth and rolloff from a power spectrum."""
    freqs = np.fft.rfftfreq(N_FFT, d=1.0 / sr).astype(np.float32)
    magnitude = np.sqrt(np.maximum(power, 0.0))
    denominator = np.sum(magnitude, axis=1) + 1e-12

    centroid = np.sum(magnitude * freqs[None, :], axis=1) / denominator

    deviation = np.abs(freqs[None, :] - centroid[:, None])
    bandwidth = np.sqrt(
        np.sum((deviation ** 2) * magnitude, axis=1) / denominator
    )

    cumulative = np.cumsum(magnitude, axis=1)
    threshold = 0.85 * cumulative[:, -1:]
    rolloff_indices = np.argmax(cumulative >= threshold, axis=1)
    rolloff = freqs[rolloff_indices]

    return centroid, bandwidth, rolloff


def zero_crossing_rate(y, frame_length=N_FFT, hop_length=HOP_LENGTH):
    """Compute centered zero-crossing-rate frames using NumPy."""
    pad = frame_length // 2
    padded = np.pad(y, (pad, pad), mode="constant")
    frame_count = 1 + max(0, (len(padded) - frame_length) // hop_length)
    indices = (
        np.arange(frame_length)[None, :]
        + hop_length * np.arange(frame_count)[:, None]
    )
    frames = padded[indices]
    crossings = np.not_equal(frames[:, 1:] >= 0, frames[:, :-1] >= 0)
    return np.mean(crossings, axis=1).astype(np.float32)


def extract_features(file_path):
    """Extract the same 88-feature layout used by the trained classifier."""

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

    audio_log("NumPy STFT started")
    frames = frame_signal(y)
    spectrum = np.fft.rfft(frames, n=N_FFT, axis=1)
    power = (np.abs(spectrum) ** 2).astype(np.float32)
    audio_log(f"NumPy STFT finished: {power.shape[0]} frames")

    audio_log("NumPy MFCC extraction started")
    filters = mel_filterbank(sr, N_FFT, N_MELS)
    mel_energy = power @ filters.T
    log_mel = np.log(np.maximum(mel_energy, 1e-10))
    mfcc = dct_type_ii_orthonormal(log_mel, N_MFCC)
    audio_log("NumPy MFCC extraction finished")

    mfcc_mean = np.mean(mfcc, axis=0)
    mfcc_std = np.std(mfcc, axis=0)

    audio_log("NumPy spectral feature extraction started")
    spectral_centroid, spectral_bandwidth, spectral_rolloff = (
        spectral_features_from_frames(power, sr)
    )
    zcr = zero_crossing_rate(y)
    audio_log("NumPy spectral feature extraction finished")

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
            np.mean(zcr),
            np.std(zcr),
        ],
    ]).astype(np.float32)

    if features.shape != (88,):
        raise ValueError(f"Unexpected audio feature shape: {features.shape}")

    audio_log(f"feature vector created: {features.shape}")
    return features


def analyze_animal_audio(file_path):
    """Predict the animal class from an audio recording."""

    features = extract_features(file_path).reshape(1, -1)
    audio_log("predict_proba started")

    probabilities = model.predict_proba(features)[0]
    audio_log("predict_proba finished")

    prediction_index = int(np.argmax(probabilities))
    predicted_class = label_encoder.inverse_transform([prediction_index])[0]
    confidence = float(probabilities[prediction_index])

    class_probabilities = {}
    for index, class_name in enumerate(label_encoder.classes_):
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
