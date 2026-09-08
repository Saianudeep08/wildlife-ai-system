import os
import tempfile

import librosa
import soundfile as sf

# BirdNET is optional for lightweight deployments. The custom animal
# classifier can still operate when BirdNET/TensorFlow is unavailable.
try:
    from birdnetlib import Recording
    from birdnetlib.analyzer import Analyzer

    analyzer = Analyzer()
    BIRDNET_AVAILABLE = True
except Exception as error:
    analyzer = None
    BIRDNET_AVAILABLE = False
    print("BirdNET unavailable:", error)


SEGMENT_DURATION = 60


def analyze_audio(file_path: str, lat: float = 0.0, lon: float = 0.0):
    """
    Analyze an audio file in 60-second segments using BirdNET when available.
    Returns an empty list when BirdNET is unavailable so the custom animal
    classifier can still process the upload.
    """

    if not BIRDNET_AVAILABLE:
        return []

    duration = librosa.get_duration(path=file_path)

    # Short recordings can be analyzed directly.
    if duration <= SEGMENT_DURATION:
        recording = Recording(
            analyzer,
            file_path,
            lat=lat,
            lon=lon,
            min_conf=0.3,
        )
        recording.analyze()
        return recording.detections

    all_detections = []

    with tempfile.TemporaryDirectory() as temp_dir:

        segment_start = 0.0
        segment_number = 0

        while segment_start < duration:

            segment_duration = min(
                SEGMENT_DURATION,
                duration - segment_start,
            )

            audio, sample_rate = librosa.load(
                file_path,
                sr=None,
                mono=True,
                offset=segment_start,
                duration=segment_duration,
            )

            segment_path = os.path.join(
                temp_dir,
                f"segment_{segment_number}.wav",
            )

            sf.write(
                segment_path,
                audio,
                sample_rate,
            )

            recording = Recording(
                analyzer,
                segment_path,
                lat=lat,
                lon=lon,
                min_conf=0.3,
            )

            recording.analyze()

            for detection in recording.detections:

                detection = detection.copy()

                detection["start_time"] = (
                    float(detection.get("start_time", 0))
                    + segment_start
                )

                detection["end_time"] = (
                    float(detection.get("end_time", 0))
                    + segment_start
                )

                all_detections.append(detection)

            segment_start += SEGMENT_DURATION
            segment_number += 1

    return all_detections
