import os
import numpy as np
import pandas as pd
import librosa
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


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

    return np.concatenate([
        np.mean(mfcc, axis=1),
        np.std(mfcc, axis=1),
    ])


def main():

    df = pd.read_csv(ANNOTATIONS)

    df = df[
        df["Species eBird Code"].isin(SPECIES.keys())
        & df["Filename"].isin([
            "KEN_023_20220119_035324.flac",
            "KEN_030_20220203_040250.flac",
            "KEN_031_20220204_040326.flac",
        ])
    ].copy()

    # First split the ORIGINAL annotations.
    train_df, test_df = train_test_split(
        df,
        test_size=0.20,
        random_state=42,
        stratify=df["Species eBird Code"],
    )

    X_train = []
    y_train = []

    # Original training samples + shifted windows.
    shifts = [-1.0, -0.5, 0.0, 0.5, 1.0]

    for _, row in train_df.iterrows():

        audio_path = os.path.join(
            RAW_DIR,
            row["Filename"],
        )

        base_time = float(row["Start Time (s)"])

        for shift in shifts:

            start_time = max(0, base_time + shift)

            try:
                features = extract_features(
                    audio_path,
                    start_time,
                )

                X_train.append(features)
                y_train.append(
                    SPECIES[row["Species eBird Code"]]
                )

            except Exception as exc:
                print(
                    f"Skipping {row['Filename']} "
                    f"@ {start_time}: {exc}"
                )

    # Test set is NOT augmented.
    X_test = []
    y_test = []

    for _, row in test_df.iterrows():

        audio_path = os.path.join(
            RAW_DIR,
            row["Filename"],
        )

        try:
            features = extract_features(
                audio_path,
                float(row["Start Time (s)"]),
            )

            X_test.append(features)
            y_test.append(
                SPECIES[row["Species eBird Code"]]
            )

        except Exception as exc:
            print(
                f"Skipping test sample "
                f"{row['Filename']}: {exc}"
            )

    X_train = np.asarray(X_train)
    y_train = np.asarray(y_train)

    X_test = np.asarray(X_test)
    y_test = np.asarray(y_test)

    print("Training samples:", len(X_train))
    print("Test samples:", len(X_test))

    print("\nTraining class distribution:")

    for name in np.unique(y_train):
        print(
            name,
            ":",
            np.sum(y_train == name)
        )

    model = RandomForestClassifier(
        n_estimators=250,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
        max_features="sqrt",
    )

    print("\nTraining V2 model...")

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    print(
        "\nV2 Accuracy:",
        round(accuracy, 4)
    )

    print("\nV2 Classification Report:")

    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0,
        )
    )

    model_path = os.path.join(
        MODEL_DIR,
        "wildlife_audio_classifier_v2.joblib",
    )

    joblib.dump(
        model,
        model_path,
    )

    print("\nV2 model saved to:")
    print(model_path)


if __name__ == "__main__":
    main()