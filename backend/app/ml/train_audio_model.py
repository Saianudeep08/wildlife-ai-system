import os
import numpy as np
import pandas as pd
import librosa
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score


BASE_DIR = "/app"

ANNOTATIONS = f"{BASE_DIR}/audio_dataset/labels/annotations.csv"
RAW_DIR = f"{BASE_DIR}/audio_dataset/raw"
MODEL_DIR = f"{BASE_DIR}/audio_dataset/processed"

os.makedirs(MODEL_DIR, exist_ok=True)


SPECIES = {
    "combul2": "Common Bulbul",
    "wbswea1": "White-browed Sparrow-Weaver",
    "gnbcam2": "Gray-backed Camaroptera",
}


def extract_features(audio_path, start_time):
    """
    Extract MFCC-based features from a 3-second window.
    """

    y, sr = librosa.load(
        audio_path,
        sr=16000,
        mono=True,
        offset=max(0, start_time),
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

    return features


def main():

    annotations = pd.read_csv(ANNOTATIONS)

    annotations = annotations[
        annotations["Species eBird Code"].isin(SPECIES.keys())
    ].copy()

    X = []
    y = []

    for _, row in annotations.iterrows():

        filename = row["Filename"]
        code = row["Species eBird Code"]
        start_time = float(row["Start Time (s)"])

        audio_path = os.path.join(
            RAW_DIR,
            filename,
        )

        if not os.path.exists(audio_path):
            continue

        try:

            features = extract_features(
                audio_path,
                start_time,
            )

            X.append(features)
            y.append(SPECIES[code])

        except Exception as exc:
            print(
                f"Skipping {filename} @ {start_time}: {exc}"
            )

    X = np.asarray(X)
    y = np.asarray(y)

    print("Total samples:", len(X))

    unique, counts = np.unique(y, return_counts=True)

    print("\nClass distribution:")

    for name, count in zip(unique, counts):
        print(f"{name}: {count}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=150,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )

    print("\nTraining model...")

    model.fit(
        X_train,
        y_train,
    )

    predictions = model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    print("\nAccuracy:", round(accuracy, 4))

    print("\nClassification report:")

    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0,
        )
    )

    model_path = os.path.join(
        MODEL_DIR,
        "wildlife_audio_classifier.joblib",
    )

    joblib.dump(
        model,
        model_path,
    )

    print("\nModel saved to:")
    print(model_path)


if __name__ == "__main__":
    main()