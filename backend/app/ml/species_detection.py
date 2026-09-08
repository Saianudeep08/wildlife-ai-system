from ultralytics import YOLO

model = YOLO("app/ml/wildlife_best.pt")

def detect_species(image_path: str):
    results = model(image_path)
    detections = []
    for r in results:
        # classification results: top prediction + confidence
        top_idx = r.probs.top1
        confidence = float(r.probs.top1conf)
        label = r.names[top_idx]
        detections.append({"label": label, "confidence": round(confidence, 3)})
    return detections