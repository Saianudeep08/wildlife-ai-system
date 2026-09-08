import { useState } from "react";
import { uploadImage, uploadAudio } from "../api";

const SPECIES_INFO = {
  wildebeest: { name: "Wildebeest", icon: "🦬" },
  zebra: { name: "Zebra", icon: "🦓" },
  gazelle_thomsons: {
    name: "Thomson's Gazelle",
    icon: "🦌",
  },
  buffalo: { name: "Buffalo", icon: "🐃" },
  elephant: { name: "Elephant", icon: "🐘" },
  hartebeest: { name: "Hartebeest", icon: "🦌" },
  impala: { name: "Impala", icon: "🦌" },
  giraffe: { name: "Giraffe", icon: "🦒" },
};

function getSpeciesInfo(label) {
  const key = String(label || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

  return (
    SPECIES_INFO[key] || {
      name: label || "Unknown Species",
      icon: "🐾",
    }
  );
}

function getConfidence(confidence) {
  const value = Number(confidence);

  if (Number.isNaN(value)) {
    return 0;
  }

  const percentage = value <= 1 ? value * 100 : value;

  return Math.max(0, Math.min(100, percentage));
}

function getConfidenceInfo(confidence) {
  if (confidence >= 90) {
    return {
      label: "Very High",
      color: "#18794e",
      background: "#e8f6ef",
    };
  }

  if (confidence >= 75) {
    return {
      label: "High",
      color: "#28705c",
      background: "#eaf4ef",
    };
  }

  if (confidence >= 50) {
    return {
      label: "Moderate",
      color: "#9a6a00",
      background: "#fff4d8",
    };
  }

  return {
    label: "Low",
    color: "#b33a2b",
    background: "#fce9e7",
  };
}

export default function Detection({
  surveys = [],
  token,
}) {
  /* =====================================================
     IMAGE DETECTION STATE
     ===================================================== */

  const [selectedSurvey, setSelectedSurvey] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [imageResult, setImageResult] =
    useState(null);

  const [imageLoading, setImageLoading] =
    useState(false);

  const [imageError, setImageError] =
    useState("");

  /* =====================================================
     AUDIO DETECTION STATE
     ===================================================== */

  const [audioSurvey, setAudioSurvey] =
    useState("");

  const [selectedAudio, setSelectedAudio] =
    useState(null);

  const [audioResult, setAudioResult] =
    useState(null);

  const [audioLoading, setAudioLoading] =
    useState(false);

  const [audioError, setAudioError] =
    useState("");

  /* =====================================================
     IMAGE FILE SELECTION
     ===================================================== */

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setImageError("");
    setImageResult(null);

    if (!file) {
      setSelectedImage(null);
      setImagePreview("");
      return;
    }

    setSelectedImage(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview("");
    }
  };

  /* =====================================================
     IMAGE DETECTION
     ===================================================== */

  const handleImageDetection = async (event) => {
    event.preventDefault();

    setImageError("");
    setImageResult(null);

    if (!selectedSurvey) {
      setImageError("Please select a monitoring survey.");
      return;
    }

    if (!selectedImage) {
      setImageError("Please select a wildlife image.");
      return;
    }

    if (!token) {
      setImageError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    setImageLoading(true);

    try {
      const response = await uploadImage(
        selectedSurvey,
        selectedImage,
        token
      );

      setImageResult(response.data);
    } catch (error) {
      console.error("Image detection error:", error);

      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to analyze the wildlife image.";

      setImageError(message);
    } finally {
      setImageLoading(false);
    }
  };

  /* =====================================================
     AUDIO FILE SELECTION
     ===================================================== */

  const handleAudioChange = (event) => {
    const file = event.target.files?.[0];

    setAudioError("");
    setAudioResult(null);

    if (!file) {
      setSelectedAudio(null);
      return;
    }

    setSelectedAudio(file);
  };

  /* =====================================================
     AUDIO DETECTION
     ===================================================== */

  const handleAudioDetection = async (event) => {
    event.preventDefault();

    setAudioError("");
    setAudioResult(null);

    if (!audioSurvey) {
      setAudioError("Please select a monitoring survey.");
      return;
    }

    if (!selectedAudio) {
      setAudioError("Please select an audio recording.");
      return;
    }

    if (!token) {
      setAudioError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    setAudioLoading(true);

    try {
      const response = await uploadAudio(
        audioSurvey,
        selectedAudio,
        token
      );

      setAudioResult(response.data);
    } catch (error) {
      console.error("Audio detection error:", error);

      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to analyze the audio recording.";

      setAudioError(message);
    } finally {
      setAudioLoading(false);
    }
  };

  /* =====================================================
     IMAGE RESULT DATA
     ===================================================== */

  const imageDetections =
    Array.isArray(imageResult?.detections)
      ? imageResult.detections
      : [];

  const bestImageDetection =
    imageDetections.length > 0
      ? [...imageDetections].sort(
          (a, b) =>
            getConfidence(b.confidence) -
            getConfidence(a.confidence)
        )[0]
      : null;

  const bestImageConfidence =
    bestImageDetection
      ? getConfidence(bestImageDetection.confidence)
      : 0;

  const bestImageConfidenceInfo =
    getConfidenceInfo(bestImageConfidence);

  /* =====================================================
     PAGE
     ===================================================== */

  return (
    <div className="page-shell detection-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="page-header">
        <div>
          <p className="eyebrow">
            AI SPECIES ANALYSIS
          </p>

          <h1>Wildlife Detection</h1>

          <p className="page-description">
            Analyze camera-trap images and wildlife
            recordings using the project's AI models.
          </p>
        </div>

        <div className="model-badge">
          <span>🤖</span>

          <div>
            <strong>Wildlife AI</strong>

            <small>
              Image + Bioacoustic Analysis
            </small>
          </div>
        </div>
      </div>

      {/* =================================================
          IMAGE DETECTION
          ================================================= */}

      <section className="detection-upload-card">

        <div className="section-heading">
          <div>
            <span className="section-number">
              01
            </span>

            <h2>
              Camera-Trap Image Detection
            </h2>
          </div>

          <span className="result-status">
            AI READY
          </span>
        </div>

        <p className="section-description">
          Upload a wildlife image and the AI model
          will identify the most likely species and
          provide a confidence score.
        </p>

        <form onSubmit={handleImageDetection}>

          <div className="detection-form-grid">

            {/* Survey */}

            <div className="form-group">

              <label htmlFor="image-survey">
                Monitoring Survey
              </label>

              <select
                id="image-survey"
                value={selectedSurvey}
                onChange={(event) =>
                  setSelectedSurvey(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select Survey
                </option>

                {surveys.map((survey) => (
                  <option
                    key={survey.id}
                    value={survey.id}
                  >
                    {survey.monitoring_location || "Unnamed Survey"}
                  </option>
                ))}
              </select>

              {surveys.length === 0 && (
                <small className="field-hint">
                  No surveys available.
                </small>
              )}
            </div>

            {/* Image */}

            <div className="form-group">

              <label htmlFor="wildlife-image">
                Wildlife Image
              </label>

              <input
                id="wildlife-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              <small className="field-hint">
                Select a camera-trap wildlife image.
              </small>
            </div>

          </div>

          {/* Image Preview */}

          {imagePreview && (
            <div className="image-preview-container">

              <div className="preview-label">
                CAMERA-TRAP IMAGE
              </div>

              <img
                src={imagePreview}
                alt="Selected wildlife"
                className="wildlife-preview"
              />

            </div>
          )}

          {/* Selected file */}

          {selectedImage && (
            <div className="selected-file">

              <span>📷</span>

              <div>
                <strong>
                  {selectedImage.name}
                </strong>

                <small>
                  {(
                    selectedImage.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </small>
              </div>

            </div>
          )}

          {/* Error */}

          {imageError && (
            <div className="detection-error">

              <strong>
                Detection Error
              </strong>

              <span>
                {imageError}
              </span>

            </div>
          )}

          {/* Button */}

          <button
            type="submit"
            className="primary-detection-button"
            disabled={
              imageLoading ||
              !selectedImage ||
              !selectedSurvey
            }
          >
            {imageLoading ? (
              <>
                <span className="spinner"></span>
                Analyzing Wildlife...
              </>
            ) : (
              <>
                🔍 Upload & Detect Species
              </>
            )}
          </button>

        </form>

        {/* =================================================
            IMAGE RESULT
            ================================================= */}

        {imageResult && (
          <div className="professional-result-card">

            {/* Header */}

            <div className="professional-result-header">

              <div>
                <span className="result-eyebrow">
                  AI ANALYSIS
                </span>

                <h3>
                  Detection Complete
                </h3>
              </div>

              <span className="success-status">
                ✓ ANALYSIS COMPLETE
              </span>

            </div>

            {/* Result Body */}

            {bestImageDetection ? (
              <div className="professional-result-body">

                {/* Main species */}

                <div className="main-species-result">

                  <div className="animal-result-icon">
                    {
                      getSpeciesInfo(
                        bestImageDetection.label
                      ).icon
                    }
                  </div>

                  <div className="main-species-content">

                    <span>
                      MOST LIKELY SPECIES
                    </span>

                    <h4>
                      {
                        getSpeciesInfo(
                          bestImageDetection.label
                        ).name
                      }
                    </h4>

                    <p>
                      The AI model identified this
                      species as the strongest
                      prediction in the uploaded image.
                    </p>

                  </div>

                  <div className="main-confidence">

                    <span>
                      CONFIDENCE
                    </span>

                    <strong
                      style={{
                        color:
                          bestImageConfidenceInfo.color,
                      }}
                    >
                      {bestImageConfidence.toFixed(
                        1
                      )}
                      %
                    </strong>

                    <div className="professional-confidence-bar">

                      <div
                        style={{
                          width: `${bestImageConfidence}%`,
                          background:
                            bestImageConfidenceInfo.color,
                        }}
                      />

                    </div>

                    <small
                      style={{
                        color:
                          bestImageConfidenceInfo.color,
                      }}
                    >
                      {
                        bestImageConfidenceInfo.label
                      }{" "}
                      Confidence
                    </small>

                  </div>

                </div>

                {/* Details */}

                <div className="detection-details-grid">

                  <div className="detail-box">
                    <span>
                      DETECTION TYPE
                    </span>

                    <strong>
                      📷 Camera Trap
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span>
                      SURVEY
                    </span>

                    <strong>
                      #{selectedSurvey}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span>
                      SPECIES FOUND
                    </span>

                    <strong>
                      {imageDetections.length}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span>
                      AI ENGINE
                    </span>

                    <strong>
                      YOLOv8
                    </strong>
                  </div>

                </div>

                {/* Multiple predictions */}

                {imageDetections.length > 0 && (
                  <div className="prediction-list">

                    <div className="prediction-list-header">
                      <div>
                        <h4>
                          Species Predictions
                        </h4>

                        <p>
                          AI confidence for each
                          returned prediction.
                        </p>
                      </div>
                    </div>

                    {imageDetections.map(
                      (detection, index) => {
                        const confidence =
                          getConfidence(
                            detection.confidence
                          );

                        const info =
                          getConfidenceInfo(
                            confidence
                          );

                        const species =
                          getSpeciesInfo(
                            detection.label
                          );

                        return (
                          <div
                            className="prediction-row"
                            key={`${detection.label}-${index}`}
                          >

                            <div className="prediction-rank">
                              #{index + 1}
                            </div>

                            <div className="prediction-icon">
                              {species.icon}
                            </div>

                            <div className="prediction-name">
                              <strong>
                                {species.name}
                              </strong>

                              <small>
                                Wildlife species
                              </small>
                            </div>

                            <div className="prediction-confidence">

                              <div className="prediction-confidence-top">

                                <span>
                                  Confidence
                                </span>

                                <strong
                                  style={{
                                    color:
                                      info.color,
                                  }}
                                >
                                  {confidence.toFixed(
                                    1
                                  )}
                                  %
                                </strong>

                              </div>

                              <div className="professional-confidence-bar small">

                                <div
                                  style={{
                                    width: `${confidence}%`,
                                    background:
                                      info.color,
                                  }}
                                />

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

                {/* Interpretation */}

                <div className="ai-interpretation">

                  <div className="interpretation-icon">
                    💡
                  </div>

                  <div>

                    <h4>
                      AI Interpretation
                    </h4>

                    <p>
                      The strongest prediction is{" "}
                      <strong>
                        {
                          getSpeciesInfo(
                            bestImageDetection.label
                          ).name
                        }
                      </strong>{" "}
                      with{" "}
                      <strong>
                        {bestImageConfidence.toFixed(
                          1
                        )}
                        %
                      </strong>{" "}
                      confidence.

                      {bestImageConfidence >= 90
                        ? " This is a very high-confidence prediction."
                        : bestImageConfidence >= 75
                        ? " This is a high-confidence prediction."
                        : bestImageConfidence >= 50
                        ? " This is a moderate-confidence prediction and may require field verification."
                        : " This is a low-confidence prediction and should be manually verified."}
                    </p>

                  </div>

                </div>

              </div>
            ) : (
              <div className="no-detection">

                <span>🐾</span>

                <h3>
                  No Wildlife Detected
                </h3>

                <p>
                  The AI model did not return a
                  species prediction for this image.
                </p>

              </div>
            )}

          </div>
        )}

      </section>

      {/* =================================================
          BIOACOUSTIC DETECTION
          ================================================= */}

      <section className="detection-upload-card">

        <div className="section-heading">

          <div>
            <span className="section-number">
              02
            </span>

            <h2>
              Bioacoustic Detection
            </h2>
          </div>

          <span className="result-status">
            AUDIO AI
          </span>

        </div>

        <p className="section-description">
          Upload a bird or animal call recording
          for bioacoustic species identification.
        </p>

        <form onSubmit={handleAudioDetection}>

          <div className="detection-form-grid">

            <div className="form-group">

              <label htmlFor="audio-survey">
                Monitoring Survey
              </label>

              <select
                id="audio-survey"
                value={audioSurvey}
                onChange={(event) =>
                  setAudioSurvey(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select Survey
                </option>

                {surveys.map((survey) => (
                  <option
                    key={survey.id}
                    value={survey.id}
                  >
                    {survey.monitoring_location || "Unnamed Survey"}
                  </option>
                ))}
              </select>

            </div>

            <div className="form-group">

              <label htmlFor="wildlife-audio">
                Audio Recording
              </label>

              <input
                id="wildlife-audio"
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
              />

              <small className="field-hint">
                Upload a wildlife or bird call.
              </small>

            </div>

          </div>

          {selectedAudio && (
            <div className="selected-file">

              <span>🎵</span>

              <div>
                <strong>
                  {selectedAudio.name}
                </strong>

                <small>
                  {(
                    selectedAudio.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </small>
              </div>

            </div>
          )}

          {audioError && (
            <div className="detection-error">

              <strong>
                Audio Detection Error
              </strong>

              <span>
                {audioError}
              </span>

            </div>
          )}

          <button
            type="submit"
            className="primary-detection-button"
            disabled={
              audioLoading ||
              !selectedAudio ||
              !audioSurvey
            }
          >
            {audioLoading ? (
              <>
                <span className="spinner"></span>
                Analyzing Audio...
              </>
            ) : (
              <>
                🎵 Upload & Identify Species
              </>
            )}
          </button>

        </form>

        {/* ============================================================
            AUDIO DETECTION RESULT
            ============================================================ */}

        {audioResult && (
          <div className="professional-result-card">

            {/* --------------------------------------------------------
                RESULT HEADER
                -------------------------------------------------------- */}

            <div className="professional-result-header">

              <div>
                <span className="result-eyebrow">
                  BIOACOUSTIC ANALYSIS
                </span>

                <h3>
                  Audio Detection Result
                </h3>
              </div>

              <span className="success-status">
                ✓ ANALYSIS COMPLETE
              </span>

            </div>

            <div className="professional-result-body">

              {/* ======================================================
                  CUSTOM ANIMAL AUDIO AI
                  ====================================================== */}

              {audioResult.animal_detection && (
                <div className="audio-animal-result">

                  <div className="audio-animal-header">

                    <div>
                      <span className="result-eyebrow">
                        ANIMAL AUDIO AI
                      </span>

                      <h3>
                        {audioResult.animal_detection.animal}
                      </h3>
                    </div>

                    <div className="audio-confidence">

                      {(() => {
                        const confidence = getConfidence(
                          audioResult.animal_detection.confidence
                        );

                        const info = getConfidenceInfo(confidence);

                        return (
                          <>
                            <strong
                              style={{
                                color: info.color,
                              }}
                            >
                              {confidence.toFixed(1)}%
                            </strong>

                            <span
                              style={{
                                color: info.color,
                              }}
                            >
                              {info.label}
                            </span>
                          </>
                        );
                      })()}

                    </div>

                  </div>

                  <p>
                    Primary prediction from the custom wildlife
                    animal audio classifier.
                  </p>

                </div>
              )}

              {/* ======================================================
                  BIRDNET / SUPPLEMENTARY ACOUSTIC ANALYSIS
                  ====================================================== */}

              {audioResult.detections &&
              audioResult.detections.length > 0 ? (

                <div className="audio-result-section">

                  <div className="audio-result-section-title">

                    <span className="result-eyebrow">
                      BIRDNET ACOUSTIC ANALYSIS
                    </span>

                    <h3>
                      Additional Acoustic Detections
                    </h3>

                    <p>
                      BirdNET provides supplementary acoustic
                      detections. These results are separate from
                      the custom animal audio classifier.
                    </p>

                  </div>

                  <div className="audio-result-list">

                    {audioResult.detections.map(
                      (detection, index) => {

                        const confidence = getConfidence(
                          detection.confidence
                        );

                        const info = getConfidenceInfo(
                          confidence
                        );

                        return (
                          <div
                            className="audio-result-row"
                            key={index}
                          >

                            <div className="audio-species-icon">
                              🎵
                            </div>

                            <div className="audio-species-name">

                              <strong>
                                {
                                  detection.common_name ||
                                  "Unknown Acoustic Class"
                                }
                              </strong>

                              {detection.scientific_name &&
                              detection.scientific_name !==
                                detection.common_name && (
                                <small>
                                  {detection.scientific_name}
                                </small>
                              )}

                              {detection.start_time !== undefined &&
                              detection.end_time !== undefined && (
                                <small>
                                  Detection interval:{" "}
                                  {Number(
                                    detection.start_time
                                  ).toFixed(1)}
                                  s –{" "}
                                  {Number(
                                    detection.end_time
                                  ).toFixed(1)}
                                  s
                                </small>
                              )}

                            </div>

                            <div className="audio-confidence">

                              <strong
                                style={{
                                  color: info.color,
                                }}
                              >
                                {confidence.toFixed(1)}%
                              </strong>

                              <span
                                style={{
                                  color: info.color,
                                }}
                              >
                                {info.label}
                              </span>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                  <div className="audio-result-note">

                    <strong>
                      Note:
                    </strong>{" "}
                    BirdNET detections are supplementary and are
                    not used as the primary animal prediction.

                  </div>

                </div>

              ) : (

                <div className="audio-no-birdnet">

                  <span>🎵</span>

                  <div>

                    <strong>
                      No additional BirdNET detection
                    </strong>

                    <p>
                      BirdNET did not return an additional
                      acoustic detection for this recording.
                    </p>

                  </div>

                </div>

              )}

              {/* ======================================================
                  NOTHING DETECTED
                  ====================================================== */}

              {!audioResult.animal_detection &&
              (!audioResult.detections ||
                audioResult.detections.length === 0) && (

                <div className="no-detection">

                  <span>🎵</span>

                  <h3>
                    No Species Identified
                  </h3>

                  <p>
                    Neither the custom animal audio classifier
                    nor BirdNET returned a prediction.
                  </p>

                </div>

              )}

            </div>

          </div>
        )}

      </section>

      {/* =================================================
          SUPPORTED SPECIES
          ================================================= */}

      <section className="supported-species-section">

        <div className="section-heading">

          <div>
            <span className="section-number">
              03
            </span>

            <h2>
              Supported Wildlife
            </h2>
          </div>

        </div>

        <p className="section-description">
          The current image classification model
          supports the following wildlife classes.
        </p>

        <div className="supported-species-grid">

          {Object.values(SPECIES_INFO).map(
            (species) => (
              <div
                className="supported-species-card"
                key={species.name}
              >
                <span>
                  {species.icon}
                </span>

                <strong>
                  {species.name}
                </strong>
              </div>
            )
          )}

        </div>

      </section>

    </div>
  );
}