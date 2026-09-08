import { useState, useEffect, useRef } from "react";
import {
  login,
  register,
  getSurveys,
  createSurvey,
  deleteSurvey,
  uploadImage,
  uploadAudio,
  getObservations,
  getBiodiversity,
  getPopulationTrends,
} from "./api";
import { decodeToken } from "./jwt";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import Surveys from "./pages/Surveys";
import Detection from "./pages/Detection";
import Reports from "./pages/Reports";
import GIS from "./pages/GIS";

function App() {
  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------

  const [token, setToken] = useState(
  () => localStorage.getItem("wildlife_token")
);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState("login");

  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState("");

  // ----------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------

const [activePage, setActivePage] = useState(() => {
  const hash = window.location.hash.replace("#", "");

  const validPages = [
    "dashboard",
    "surveys",
    "detection",
    "analytics",
    "reports",
    "gis",
    "live-detection",
  ];

  return validPages.includes(hash) ? hash : "dashboard";
});

  // ----------------------------------------------------
  // DATA
  // ----------------------------------------------------

const [surveys, setSurveys] = useState([]);
const [observations, setObservations] = useState([]);
const [biodiversity, setBiodiversity] = useState(null);
const [populationTrends, setPopulationTrends] = useState(null);
const [biodiversitySurveyId, setBiodiversitySurveyId] = useState("");

  // ----------------------------------------------------
  // SURVEY CREATION
  // ----------------------------------------------------

  const [newSurvey, setNewSurvey] = useState({
    monitoring_location: "",
    latitude: "",
    longitude: "",
    habitat_type: "",
    protected_area: "",
  });
  

const [showCreateSurvey, setShowCreateSurvey] = useState(false);

  // ----------------------------------------------------
  // IMAGE DETECTION
  // ----------------------------------------------------

  const [uploadFile, setUploadFile] = useState(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // ----------------------------------------------------
  // AUDIO DETECTION
  // ----------------------------------------------------

  const [audioFile, setAudioFile] = useState(null);
  const [audioSurveyId, setAudioSurveyId] = useState("");
  const [audioResult, setAudioResult] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);

  // ----------------------------------------------------
  // LIVE CAMERA DETECTION
  // ----------------------------------------------------

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraSurveyId, setCameraSurveyId] = useState("");
  const [liveResult, setLiveResult] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // ----------------------------------------------------
  // LOAD DATA AFTER LOGIN
  // ----------------------------------------------------

  useEffect(() => {
    if (!token) return;

    fetchSurveys();
    fetchObservations();
    setUserInfo(decodeToken(token));
  }, [token]);

  // ----------------------------------------------------
  // DEFAULT BIODIVERSITY SURVEY
  // ----------------------------------------------------

  useEffect(() => {
    if (
      surveys.length > 0 &&
      !biodiversitySurveyId
    ) {
      setBiodiversitySurveyId(String(surveys[0].id));
    }
  }, [surveys, biodiversitySurveyId]);

  // ----------------------------------------------------
  // LOAD BIODIVERSITY
  // ----------------------------------------------------

  useEffect(() => {
  if (biodiversitySurveyId && token) {
    fetchBiodiversity(biodiversitySurveyId);
    fetchPopulationTrends(biodiversitySurveyId);
  }
}, [biodiversitySurveyId, token]);

  // ----------------------------------------------------
  // STOP CAMERA WHEN APP UNMOUNTS
  // ----------------------------------------------------

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ----------------------------------------------------
  // API FUNCTIONS
  // ----------------------------------------------------

  const fetchSurveys = async () => {
    try {
      const res = await getSurveys(token);
      setSurveys(res.data || []);
    } catch (err) {
      console.error("Failed to load surveys:", err);
      setError("Failed to load surveys");
    }
  };

  const fetchObservations = async () => {
    try {
      const res = await getObservations(token);
      setObservations(res.data || []);
    } catch (err) {
      console.error(
        "Failed to load observations:",
        err
      );
    }
  };

  const fetchBiodiversity = async (surveyId) => {
    try {
      const res = await getBiodiversity(
        surveyId,
        token
      );

      setBiodiversity(res.data);
    } catch (err) {
      console.error(
        "Failed to load biodiversity:",
        err
      );

      setBiodiversity(null);
    }
  };
  const fetchPopulationTrends = async (surveyId) => {
  try {
    const res = await getPopulationTrends(surveyId, token);
    setPopulationTrends(res.data);
  } catch (err) {
    console.error("Failed to load population trends:", err);
    setPopulationTrends(null);
  }
};

  // ----------------------------------------------------
  // LOGIN / REGISTER
  // ----------------------------------------------------

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "register") {
        await register(
          email,
          password,
          fullName,
          "researcher"
        );

        setMode("login");
        setError("Registered! Now log in.");
      } else {
        const res = await login(
          email,
          password
        );

const accessToken = res.data.access_token;

localStorage.setItem("wildlife_token", accessToken);
setToken(accessToken);
window.location.hash = "dashboard";
setActivePage("dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Something went wrong"
      );
    }
  };

  // ----------------------------------------------------
  // CREATE SURVEY
  // ----------------------------------------------------

  const handleCreateSurvey = async (e) => {
    console.log("CREATE SURVEY SUBMITTED", newSurvey);
    e.preventDefault();
    setError("");

    try {
      await createSurvey(
        {
          ...newSurvey,
          latitude: parseFloat(
            newSurvey.latitude
          ),
          longitude: parseFloat(
            newSurvey.longitude
          ),
        },
        token
      );

      setNewSurvey({
        monitoring_location: "",
        latitude: "",
        longitude: "",
        habitat_type: "",
        protected_area: "",
      });

      await fetchSurveys();

      setActivePage("surveys");
      setShowCreateSurvey(false);
    } catch (err) {
      console.error(
        "Failed to create survey:",
        err
      );

      setError("Failed to create survey");
    }
  };

  const handleDeleteSurvey = async (surveyId) => {
  try {
    setError("");

    await deleteSurvey(surveyId, token);

    await fetchSurveys();

    if (biodiversitySurveyId === String(surveyId)) {
      setBiodiversitySurveyId("");
      setBiodiversity(null);
      setPopulationTrends(null);
    }
  } catch (err) {
    console.error("Failed to delete survey:", err);

    setError(
      err.response?.data?.detail ||
        "Failed to delete survey"
    );
  }
};

  // ----------------------------------------------------
  // IMAGE UPLOAD + DETECTION
  // ----------------------------------------------------

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadFile || !selectedSurveyId) {
      setError(
        "Select a survey and image before uploading."
      );
      return;
    }

    setUploadLoading(true);
    setUploadResult(null);
    setError("");

    try {
      const res = await uploadImage(
        selectedSurveyId,
        uploadFile,
        token
      );

      setUploadResult(res.data);

      await fetchObservations();

      if (
        String(biodiversitySurveyId) ===
        String(selectedSurveyId)
      ) {
        await fetchBiodiversity(
          selectedSurveyId
        );
      }
    } catch (err) {
      console.error(
        "Image detection failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Image detection failed"
      );
    } finally {
      setUploadLoading(false);
    }
  };

  // ----------------------------------------------------
  // AUDIO UPLOAD + DETECTION
  // ----------------------------------------------------

  const handleAudioUpload = async (e) => {
    e.preventDefault();

    if (!audioFile || !audioSurveyId) {
      setError(
        "Select a survey and audio file before uploading."
      );
      return;
    }

    setAudioLoading(true);
    setAudioResult(null);
    setError("");

    try {
      const res = await uploadAudio(
        audioSurveyId,
        audioFile,
        token
      );

      setAudioResult(res.data);

      await fetchObservations();

      if (
        String(biodiversitySurveyId) ===
        String(audioSurveyId)
      ) {
        await fetchBiodiversity(
          audioSurveyId
        );
      }
    } catch (err) {
      console.error(
        "Audio analysis failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Audio analysis failed"
      );
    } finally {
      setAudioLoading(false);
    }
  };

  // ----------------------------------------------------
  // START CAMERA
  // ----------------------------------------------------

  const startCamera = async () => {
    setCameraError("");

    try {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "Camera access is not supported by this browser."
        );
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;
      }

      setCameraOn(true);
    } catch (err) {
      console.error(
        "Camera access failed:",
        err
      );

      setCameraError(
        "Could not access camera. Check browser permissions."
      );
    }
  };

  // ----------------------------------------------------
  // STOP CAMERA
  // ----------------------------------------------------

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  };

  // ----------------------------------------------------
  // CAPTURE LIVE FRAME + DETECT
  // ----------------------------------------------------

  const captureAndDetect = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current
    ) {
      setCameraError(
        "Camera is not ready."
      );
      return;
    }

    if (!cameraSurveyId) {
      setCameraError(
        "Select a survey before capturing."
      );
      return;
    }

    setCameraError("");
    setLiveLoading(true);
    setLiveResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setCameraError(
        "Camera frame is not ready yet."
      );
      setLiveLoading(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx =
      canvas.getContext("2d");

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setCameraError(
            "Could not capture camera frame."
          );
          setLiveLoading(false);
          return;
        }

        try {
          const file = new File(
            [blob],
            `camera-capture-${Date.now()}.jpg`,
            {
              type: "image/jpeg",
            }
          );

          const res =
            await uploadImage(
              cameraSurveyId,
              file,
              token
            );

          setLiveResult(res.data);

          await fetchObservations();

          if (
            String(
              biodiversitySurveyId
            ) ===
            String(cameraSurveyId)
          ) {
            await fetchBiodiversity(
              cameraSurveyId
            );
          }
        } catch (err) {
          console.error(
            "Live detection failed:",
            err
          );

          setCameraError(
            err.response?.data?.detail ||
              "Detection failed on captured frame."
          );
        } finally {
          setLiveLoading(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // ----------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------

const handleLogout = () => {
  stopCamera();

  localStorage.removeItem("wildlife_token");
  window.location.hash = "login";

  setToken(null);
  setUserInfo(null);
  setActivePage("dashboard");

    setSurveys([]);
    setObservations([]);
    setBiodiversity(null);
    setUploadResult(null);
    setAudioResult(null);
    setLiveResult(null);

    setEmail("");
    setPassword("");
  };

  // ----------------------------------------------------
  // PAGE NAVIGATION
  // ----------------------------------------------------

  const navigate = (page) => {
  setActivePage(page);
  window.location.hash = page;
    setError("");

    if (page !== "live-detection") {
      stopCamera();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ----------------------------------------------------
  // LOGIN / REGISTER SCREEN
  // ----------------------------------------------------

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-cover">
          <span className="auth-eyebrow">
            FIELD ACCESS TERMINAL
          </span>

          <h1>
            Wildlife Population
            <br />
            Intelligence System
          </h1>

          <p className="auth-tagline">
            Species detection, bioacoustic analysis,
            and biodiversity intelligence for
            conservation teams in the field.
          </p>

          <div className="auth-coords">
            <span>LAT 19.0000° N</span>
            <span>LON 78.9000° E</span>
          </div>
        </div>

        <div className="auth-panel">
          <form onSubmit={handleAuth}>
            <span className="clip" />

            <h2>
              {mode === "login"
                ? "Sign In"
                : "Register"}
            </h2>

            {mode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                required
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button type="submit">
              {mode === "login"
                ? "Sign In"
                : "Register"}
            </button>

            {error && (
              <p className="error">
                {error}
              </p>
            )}

            <p
              className="switch"
              onClick={() => {
                setMode(
                  mode === "login"
                    ? "register"
                    : "login"
                );
                setError("");
              }}
            >
              {mode === "login"
                ? "Need an account? Register"
                : "Have an account? Sign in"}
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN APPLICATION
  // ----------------------------------------------------

  return (
    <div className="dashboard">
      {/* HEADER */}

      <header className="app-header">
        <div className="brand-area">
          <h1>
            🦁 Wildlife Population Intelligence System
          </h1>

          {userInfo && (
            <span className="role-badge">
              {userInfo.role}
            </span>
          )}
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* NAVIGATION */}

      <nav className="main-nav">
        <button
          type="button"
          className={
            activePage === "dashboard"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("dashboard")
          }
        >
          Dashboard
        </button>

        <button
          type="button"
          className={
            activePage === "surveys"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("surveys")
          }
        >
          Surveys
        </button>

        <button
          type="button"
          className={
            activePage === "detection"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("detection")
          }
        >
          Detection
        </button>

        <button
          type="button"
          className={
            activePage === "analytics"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("analytics")
          }
        >
          Analytics
        </button>

          <button
  type="button"
  className={
    activePage === "reports"
      ? "nav-active"
      : ""
  }
  onClick={() =>
    navigate("reports")
  }
>
  Reports
</button>

        <button
          type="button"
          className={
            activePage === "gis"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("gis")
          }
        >
          GIS Map
        </button>

        <button
          type="button"
          className={
            activePage ===
            "live-detection"
              ? "nav-active"
              : ""
          }
          onClick={() =>
            navigate("live-detection")
          }
        >
          Live Detection
        </button>
      </nav>

      {/* GLOBAL ERROR */}

      {error && (
        <div
          style={{
            margin: "15px 0",
            padding: "12px 15px",
            borderRadius: "8px",
            background: "#f9e5e0",
            color: "#8d2e22",
            border: "1px solid #dfb0a6",
          }}
        >
          {error}

          <button
            type="button"
            onClick={() => setError("")}
            style={{
              float: "right",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ==================================================
          DASHBOARD PAGE
          ================================================== */}

      {activePage === "dashboard" && (
        <Dashboard
          token={token}
          surveys={surveys}
          userInfo={userInfo}
        />
      )}

      {/* ==================================================
          SURVEYS PAGE
          ================================================== */}

      {activePage === "surveys" && (
        <Surveys
          surveys={surveys}
          observations={observations}
          onCreateSurvey={() =>
          setShowCreateSurvey(true)
        }
         onDeleteSurvey={handleDeleteSurvey}
        />
      )}
      {showCreateSurvey && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(42, 36, 28, 0.52)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      zIndex: 1000,
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "680px",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "#fffdf8",
        border: "1px solid #dfd3c1",
        borderRadius: "16px",
        padding: "30px",
        boxShadow: "0 25px 70px rgba(0, 0, 0, 0.25)",
        boxSizing: "border-box",
      }}
    >
      {/* ================================
          MODAL HEADER
          ================================ */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          paddingBottom: "20px",
          borderBottom: "1px solid #eee5d9",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#2a241c",
              fontSize: "1.6rem",
              lineHeight: 1.2,
              fontFamily: "Georgia, serif",
            }}
          >
            Create New Survey
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#81766a",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            Register a new wildlife monitoring location.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateSurvey(false)}
          aria-label="Close create survey form"
          style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #d7c9b6",
            borderRadius: "8px",
            background: "#f8f3ea",
            color: "#5f574d",
            fontSize: "20px",
            lineHeight: 1,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* ================================
          CREATE SURVEY FORM
          ================================ */}

      <form onSubmit={handleCreateSurvey}>

        {/* Monitoring Location */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "7px",
              color: "#51483d",
              fontSize: "0.78rem",
              fontWeight: 750,
              letterSpacing: "0.04em",
            }}
          >
            Monitoring Location
          </label>

          <input
            type="text"
            value={newSurvey.monitoring_location}
            onChange={(e) =>
              setNewSurvey({
                ...newSurvey,
                monitoring_location: e.target.value,
              })
            }
            placeholder="e.g. Kawal Tiger Reserve"
            required
            style={{
              width: "100%",
              padding: "12px 13px",
              border: "1px solid #d9cdbb",
              borderRadius: "9px",
              background: "#fffdf8",
              color: "#2a241c",
              fontSize: "0.92rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Latitude + Longitude */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "18px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#51483d",
                fontSize: "0.78rem",
                fontWeight: 750,
                letterSpacing: "0.04em",
              }}
            >
              Latitude
            </label>

            <input
              type="number"
              step="any"
              value={newSurvey.latitude}
              onChange={(e) =>
                setNewSurvey({
                  ...newSurvey,
                  latitude: e.target.value,
                })
              }
              placeholder="e.g. 19.0"
              required
              style={{
                width: "100%",
                padding: "12px 13px",
                border: "1px solid #d9cdbb",
                borderRadius: "9px",
                background: "#fffdf8",
                color: "#2a241c",
                fontSize: "0.92rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#51483d",
                fontSize: "0.78rem",
                fontWeight: 750,
                letterSpacing: "0.04em",
              }}
            >
              Longitude
            </label>

            <input
              type="number"
              step="any"
              value={newSurvey.longitude}
              onChange={(e) =>
                setNewSurvey({
                  ...newSurvey,
                  longitude: e.target.value,
                })
              }
              placeholder="e.g. 78.9"
              required
              style={{
                width: "100%",
                padding: "12px 13px",
                border: "1px solid #d9cdbb",
                borderRadius: "9px",
                background: "#fffdf8",
                color: "#2a241c",
                fontSize: "0.92rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Habitat + Protected Area */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "18px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#51483d",
                fontSize: "0.78rem",
                fontWeight: 750,
                letterSpacing: "0.04em",
              }}
            >
              Habitat Type
            </label>

            <input
              type="text"
              value={newSurvey.habitat_type}
              onChange={(e) =>
                setNewSurvey({
                  ...newSurvey,
                  habitat_type: e.target.value,
                })
              }
              placeholder="e.g. Forest"
              required
              style={{
                width: "100%",
                padding: "12px 13px",
                border: "1px solid #d9cdbb",
                borderRadius: "9px",
                background: "#fffdf8",
                color: "#2a241c",
                fontSize: "0.92rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#51483d",
                fontSize: "0.78rem",
                fontWeight: 750,
                letterSpacing: "0.04em",
              }}
            >
              Protected Area
            </label>

            <input
              type="text"
              value={newSurvey.protected_area}
              onChange={(e) =>
                setNewSurvey({
                  ...newSurvey,
                  protected_area: e.target.value,
                })
              }
              placeholder="e.g. Kawal Tiger Reserve"
              required
              style={{
                width: "100%",
                padding: "12px 13px",
                border: "1px solid #d9cdbb",
                borderRadius: "9px",
                background: "#fffdf8",
                color: "#2a241c",
                fontSize: "0.92rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Helpful note */}

        <div
          style={{
            padding: "12px 14px",
            marginTop: "4px",
            borderRadius: "9px",
            background: "#f8f3ea",
            border: "1px solid #e5d9c8",
            color: "#766c60",
            fontSize: "0.78rem",
            lineHeight: 1.5,
          }}
        >
          Enter the geographic coordinates and habitat information
          for the wildlife monitoring location.
        </div>

        {/* ================================
            ACTION BUTTONS
            ================================ */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid #eee5d9",
          }}
        >
          <button
            type="button"
            onClick={() => setShowCreateSurvey(false)}
            style={{
              padding: "11px 18px",
              border: "1px solid #d7c9b6",
              borderRadius: "8px",
              background: "#f7f0e6",
              color: "#51483d",
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            style={{
              padding: "11px 20px",
              border: "1px solid #c56f16",
              borderRadius: "8px",
              background: "#c97a1f",
              color: "#ffffff",
              fontSize: "0.84rem",
              fontWeight: 750,
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(150, 88, 24, 0.12)",
            }}
          >
            Create Survey
          </button>
        </div>

      </form>
    </div>
  </div>
)}

      {/* ==================================================
          DETECTION PAGE
          ================================================== */}

      {activePage === "detection" && (
        <Detection
          surveys={surveys}
          token={token}
        />
      )}

      {/* ==================================================
          ANALYTICS PAGE
          ================================================== */}

            {/* ==================================================
          ANALYTICS PAGE
          ================================================== */}

      {activePage === "analytics" && (
        <section
          style={{
            width: "100%",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >

          {/* ==================================================
              ANALYTICS HEADER
              ================================================== */}

          <div
            style={{
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#2a241c",
                fontSize: "2rem",
                fontFamily: "Georgia, serif",
              }}
            >
              Wildlife Analytics
            </h2>

            <p
              className="hint-text"
              style={{
                marginTop: "8px",
              }}
            >
              Biodiversity, population intelligence and
              conservation insights for your monitoring surveys.
            </p>
          </div>


          {/* ==================================================
              SURVEY SELECTOR
              ================================================== */}

          <div
            style={{
              padding: "18px 20px",
              border: "1px solid #dfd3c1",
              borderRadius: "12px",
              background: "#fffdf8",
              marginBottom: "20px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#51483d",
                fontSize: "0.76rem",
                fontWeight: 750,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Monitoring Survey
            </label>

            <select
              value={biodiversitySurveyId}
              onChange={(e) => {
                setBiodiversitySurveyId(e.target.value);
              }}
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "12px 14px",
                border: "1px solid #d9cdbb",
                borderRadius: "9px",
                background: "#fffdf8",
                color: "#2a241c",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              {surveys.length === 0 ? (
                <option value="">
                  No surveys available
                </option>
              ) : (
                surveys.map((survey) => (
                  <option
                    key={survey.id}
                    value={survey.id}
                  >
                    {survey.monitoring_location}
                  </option>
                ))
              )}
            </select>
          </div>


          {/* ==================================================
              NO SURVEY STATE
              ================================================== */}

          {!biodiversitySurveyId && (
            <div
              style={{
                padding: "50px 20px",
                border: "1px dashed #d7c9b6",
                borderRadius: "12px",
                textAlign: "center",
                background: "#fffdf8",
                color: "#766c60",
              }}
            >
              Select a monitoring survey to view wildlife analytics.
            </div>
          )}


          {/* ==================================================
              ANALYTICS DATA
              ================================================== */}

          {biodiversity && (
            <>

              {/* ==================================================
                  ECOSYSTEM HEALTH
                  ================================================== */}

              <div
                style={{
                  padding: "24px",
                  border: "1px solid #dfd3c1",
                  borderRadius: "14px",
                  background: "#fffdf8",
                  marginBottom: "20px",
                  boxShadow: "0 3px 12px rgba(50, 40, 30, 0.04)",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >

                  <div>
                    <span
                      style={{
                        display: "block",
                        color: "#7a7064",
                        fontSize: "0.72rem",
                        fontWeight: 750,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Ecosystem Health
                    </span>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginTop: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong
                        style={{
                          color: "#c97a1f",
                          fontSize: "2.5rem",
                          lineHeight: 1,
                        }}
                      >
                        {Number(
                          biodiversity.ecosystem_health_score || 0
                        ).toFixed(1)}
                      </strong>

                      <span
                        style={{
                          padding: "7px 11px",
                          borderRadius: "20px",
                          background: "#e8f1f2",
                          color: "#1b6b7d",
                          fontSize: "0.75rem",
                          fontWeight: 750,
                        }}
                      >
                        {biodiversity.conservation_status ||
                          "Not classified"}
                      </span>
                    </div>
                  </div>


                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >

                    <div
                      style={{
                        minWidth: "160px",
                        padding: "14px",
                        borderRadius: "10px",
                        background: "#f8f3ea",
                        border: "1px solid #e5d9c8",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#7a7064",
                          fontSize: "0.68rem",
                          fontWeight: 750,
                          textTransform: "uppercase",
                        }}
                      >
                        Shannon Diversity
                      </span>

                      <strong
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color: "#2f2922",
                          fontSize: "1.3rem",
                        }}
                      >
                        {Number(
                          biodiversity.shannon_diversity_index || 0
                        ).toFixed(3)}
                      </strong>
                    </div>


                    <div
                      style={{
                        minWidth: "130px",
                        padding: "14px",
                        borderRadius: "10px",
                        background: "#f8f3ea",
                        border: "1px solid #e5d9c8",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#7a7064",
                          fontSize: "0.68rem",
                          fontWeight: 750,
                          textTransform: "uppercase",
                        }}
                      >
                        Unique Species
                      </span>

                      <strong
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color: "#2f2922",
                          fontSize: "1.3rem",
                        }}
                      >
                        {biodiversity.unique_species || 0}
                      </strong>
                    </div>

                  </div>
                </div>
              </div>


              {/* ==================================================
                  POPULATION OVERVIEW
                  ================================================== */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "14px",
                  marginBottom: "20px",
                }}
              >

                <div
                  style={{
                    padding: "18px",
                    border: "1px solid #dfd3c1",
                    borderRadius: "12px",
                    background: "#fffdf8",
                  }}
                >
                  <span
                    style={{
                      color: "#7a7064",
                      fontSize: "0.7rem",
                      fontWeight: 750,
                      textTransform: "uppercase",
                    }}
                  >
                    Total Population
                  </span>

                  <div
                    style={{
                      marginTop: "7px",
                      color: "#c97a1f",
                      fontSize: "1.8rem",
                      fontWeight: 800,
                    }}
                  >
                    {biodiversity.total_population || 0}
                  </div>
                </div>


                <div
                  style={{
                    padding: "18px",
                    border: "1px solid #dfd3c1",
                    borderRadius: "12px",
                    background: "#fffdf8",
                  }}
                >
                  <span
                    style={{
                      color: "#7a7064",
                      fontSize: "0.7rem",
                      fontWeight: 750,
                      textTransform: "uppercase",
                    }}
                  >
                    Total Observations
                  </span>

                  <div
                    style={{
                      marginTop: "7px",
                      color: "#1b6b7d",
                      fontSize: "1.8rem",
                      fontWeight: 800,
                    }}
                  >
                    {biodiversity.total_observations || 0}
                  </div>
                </div>


                <div
                  style={{
                    padding: "18px",
                    border: "1px solid #dfd3c1",
                    borderRadius: "12px",
                    background: "#fffdf8",
                  }}
                >
                  <span
                    style={{
                      color: "#7a7064",
                      fontSize: "0.7rem",
                      fontWeight: 750,
                      textTransform: "uppercase",
                    }}
                  >
                    Species Detected
                  </span>

                  <div
                    style={{
                      marginTop: "7px",
                      color: "#2f2922",
                      fontSize: "1.8rem",
                      fontWeight: 800,
                    }}
                  >
                    {biodiversity.unique_species || 0}
                  </div>
                </div>

              </div>


              {/* ==================================================
                  SPECIES SUMMARY
                  ================================================== */}

              <div
                style={{
                  border: "1px solid #dfd3c1",
                  borderRadius: "14px",
                  background: "#fffdf8",
                  marginBottom: "20px",
                  overflow: "hidden",
                }}
              >

                <div
                  style={{
                    padding: "20px",
                    borderBottom: "1px solid #eee5d9",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: "#2f2922",
                    }}
                  >
                    Population & Species Summary
                  </h3>

                  <p
                    className="hint-text"
                    style={{
                      margin: "6px 0 0",
                    }}
                  >
                    Species detected within the selected monitoring survey.
                  </p>
                </div>


                {biodiversity.population_by_species &&
                Object.keys(
                  biodiversity.population_by_species
                ).length > 0 ? (

                  <div
                    style={{
                      overflowX: "auto",
                    }}
                  >

                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                      }}
                    >

                      <thead>
                        <tr>

                          <th
                            style={{
                              width: "50%",
                              padding: "13px 20px",
                              textAlign: "left",
                              background: "#f8f3ea",
                              color: "#51483d",
                              fontSize: "0.76rem",
                            }}
                          >
                            Species
                          </th>

                          <th
                            style={{
                              width: "25%",
                              padding: "13px 20px",
                              textAlign: "right",
                              background: "#f8f3ea",
                              color: "#51483d",
                              fontSize: "0.76rem",
                            }}
                          >
                            Population
                          </th>

                          <th
                            style={{
                              width: "25%",
                              padding: "13px 20px",
                              textAlign: "right",
                              background: "#f8f3ea",
                              color: "#51483d",
                              fontSize: "0.76rem",
                            }}
                          >
                            Distribution
                          </th>

                        </tr>
                      </thead>


                      <tbody>

                        {Object.entries(
                          biodiversity.population_by_species
                        ).map(
                          ([species, population]) => (

                            <tr key={species}>

                              <td
                                style={{
                                  padding: "12px 20px",
                                  textAlign: "left",
                                  borderBottom: "1px solid #eee5d9",
                                  color: "#2f2922",
                                }}
                              >
                                <strong>
                                  {species}
                                </strong>
                              </td>

                              <td
                                style={{
                                  padding: "12px 20px",
                                  textAlign: "right",
                                  borderBottom: "1px solid #eee5d9",
                                  color: "#2f2922",
                                  fontWeight: 700,
                                }}
                              >
                                {population}
                              </td>

                              <td
                                style={{
                                  padding: "12px 20px",
                                  textAlign: "right",
                                  borderBottom: "1px solid #eee5d9",
                                  color: "#766c60",
                                }}
                              >
                                {Number(
                                  biodiversity.species_distribution?.[
                                    species
                                  ] || 0
                                ).toFixed(1)}
                                %
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                ) : (

                  <p
                    className="empty-note"
                    style={{
                      padding: "20px",
                    }}
                  >
                    No wildlife observations are available for
                    this survey yet.
                  </p>

                )}

              </div>


              {/* ==================================================
                  POPULATION TRENDS
                  ================================================== */}

<div
  style={{
    border: "1px solid #dfd3c1",
    borderRadius: "14px",
    background: "#fffdf8",
    marginBottom: "20px",
    overflow: "hidden",
  }}
>
  <div
    style={{
      padding: "20px",
      borderBottom: "1px solid #eee5d9",
    }}
  >
    <h3
      style={{
        margin: 0,
        color: "#2f2922",
      }}
    >
      Population Trends
    </h3>

    <p
      className="hint-text"
      style={{
        margin: "6px 0 0",
      }}
    >
      Population changes compared with the previous survey
      at the same monitoring location.
    </p>
  </div>

  {populationTrends?.trends &&
  populationTrends.trends.length > 0 ? (
    <div
      style={{
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                width: "27%",
                padding: "13px 18px",
                textAlign: "left",
                background: "#f8f3ea",
                color: "#51483d",
                fontSize: "0.76rem",
              }}
            >
              Species
            </th>

            <th
              style={{
                width: "14%",
                padding: "13px 10px",
                textAlign: "right",
                background: "#f8f3ea",
                color: "#51483d",
                fontSize: "0.76rem",
              }}
            >
              Previous
            </th>

            <th
              style={{
                width: "14%",
                padding: "13px 10px",
                textAlign: "right",
                background: "#f8f3ea",
                color: "#51483d",
                fontSize: "0.76rem",
              }}
            >
              Current
            </th>

            <th
              style={{
                width: "13%",
                padding: "13px 10px",
                textAlign: "right",
                background: "#f8f3ea",
                color: "#51483d",
                fontSize: "0.76rem",
              }}
            >
              Change
            </th>

            <th
              style={{
                width: "14%",
                padding: "13px 10px",
                textAlign: "right",
                background: "#f8f3ea",
                color: "#51483d",
                fontSize: "0.76rem",
              }}
            >
              % Change
            </th>

            <th
              style={{
                width: "18%",
                padding: "13px 18px",
                textAlign: "center",
                background: "#f8f3ea",
                color: "#51483d",
                fontSize: "0.76rem",
              }}
            >
              Trend
            </th>
          </tr>
        </thead>

        <tbody>
          {populationTrends.trends.map((trend) => {
            const percentageChange =
              trend.percentage_change;

            const trendColor =
              trend.trend === "Increasing"
                ? "#3d6b42"
                : trend.trend === "Decreasing"
                  ? "#a13b2e"
                  : "#8a641d";

            const trendBackground =
              trend.trend === "Increasing"
                ? "#e8f1e8"
                : trend.trend === "Decreasing"
                  ? "#f8e6e2"
                  : "#f4eadb";

            return (
              <tr key={trend.species}>
                <td
                  style={{
                    padding: "13px 18px",
                    textAlign: "left",
                    borderBottom: "1px solid #eee5d9",
                    color: "#2f2922",
                  }}
                >
                  <strong>
                    {trend.species}
                  </strong>
                </td>

                <td
                  style={{
                    padding: "13px 10px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee5d9",
                    color: "#51483d",
                  }}
                >
                  {trend.previous_population}
                </td>

                <td
                  style={{
                    padding: "13px 10px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee5d9",
                    color: "#2f2922",
                    fontWeight: 700,
                  }}
                >
                  {trend.current_population}
                </td>

                <td
                  style={{
                    padding: "13px 10px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee5d9",
                    fontWeight: 700,
                    color: trendColor,
                  }}
                >
                  {trend.change > 0
                    ? `+${trend.change}`
                    : trend.change}
                </td>

                <td
                  style={{
                    padding: "13px 10px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee5d9",
                    fontWeight: 700,
                    color: trendColor,
                  }}
                >
                  {percentageChange === null ||
                  percentageChange === undefined
                    ? "New"
                    : `${
                        percentageChange > 0
                          ? "+"
                          : ""
                      }${percentageChange}%`}
                </td>

                <td
                  style={{
                    padding: "13px 18px",
                    textAlign: "center",
                    borderBottom: "1px solid #eee5d9",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: "85px",
                      padding: "6px 10px",
                      borderRadius: "14px",
                      background: trendBackground,
                      color: trendColor,
                      fontSize: "0.72rem",
                      fontWeight: 750,
                      textAlign: "center",
                    }}
                  >
                    {trend.trend}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <div
      style={{
        padding: "28px 20px",
        textAlign: "center",
        background: "#fffdf8",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#51483d",
          fontWeight: 700,
        }}
      >
        {populationTrends?.status ===
        "Insufficient Data"
          ? "Insufficient historical data"
          : "No population trend available"}
      </p>

      <p
        className="empty-note"
        style={{
          margin: "7px 0 0",
        }}
      >
        {populationTrends?.message ||
          "Create another survey at this monitoring location to begin tracking population changes."}
      </p>
    </div>
  )}
</div>


              {/* ==================================================
                  CONSERVATION RECOMMENDATIONS
                  ================================================== */}

              {biodiversity.recommendations &&
              biodiversity.recommendations.length > 0 && (

                <div
                  style={{
                    padding: "22px",
                    border: "1px solid #dfd3c1",
                    borderRadius: "14px",
                    background: "#f8f3ea",
                    marginBottom: "20px",
                  }}
                >

                  <h3
                    style={{
                      margin: 0,
                      color: "#2f2922",
                    }}
                  >
                    Conservation Recommendations
                  </h3>

                  <p
                    className="hint-text"
                    style={{
                      marginTop: "6px",
                    }}
                  >
                    Recommendations generated from the current
                    biodiversity analysis.
                  </p>

                  <ul
                    style={{
                      marginTop: "15px",
                      marginBottom: 0,
                      paddingLeft: "20px",
                    }}
                  >

                    {biodiversity.recommendations.map(
                      (recommendation, index) => (

                        <li
                          key={index}
                          style={{
                            marginBottom: "9px",
                            color: "#51483d",
                            lineHeight: 1.5,
                          }}
                        >
                          {recommendation}
                        </li>

                      )
                    )}

                  </ul>

                </div>

              )}

            </>
          )}

        </section>
      )}

      {/* ==================================================
          REPORTS PAGE
          ================================================== */}

        {activePage === "reports" && (
          <Reports token={token} />
          )}

      {/* ==================================================
          GIS MAP PAGE
          ================================================== */}

      {activePage === "gis" && (
        <GIS token={token} />
      )}

      {/* ==================================================
          LIVE DETECTION PAGE
          ================================================== */}

      {activePage ===
        "live-detection" && (
        <section
          style={{
            width: "100%",
          }}
        >
          <h2>
            📷 Live Wildlife Detection
          </h2>

          <p className="hint-text">
            Use your device camera to capture a
            wildlife frame and send it through
            the species detection model.
          </p>

          <div
            className="camera-controls"
            style={{
              marginTop: "20px",
            }}
          >
            <select
              value={cameraSurveyId}
              onChange={(e) =>
                setCameraSurveyId(
                  e.target.value
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
                  {survey.monitoring_location}
                </option>
              ))}
            </select>

            {!cameraOn ? (
              <button
                type="button"
                onClick={startCamera}
              >
                Start Camera
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={
                    captureAndDetect
                  }
                  disabled={liveLoading}
                >
                  {liveLoading
                    ? "Detecting..."
                    : "Capture & Detect"}
                </button>

                <button
                  type="button"
                  className="btn-stop"
                  onClick={stopCamera}
                >
                  Stop Camera
                </button>
              </>
            )}
          </div>

          {cameraError && (
            <p className="error">
              {cameraError}
            </p>
          )}

          <div
            className="camera-preview-wrap"
            style={{
              marginTop: "20px",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={
                cameraOn
                  ? "camera-preview"
                  : "camera-preview camera-preview-hidden"
              }
            />

            {!cameraOn && (
              <div className="camera-placeholder">
                Camera is off
              </div>
            )}
          </div>

          <canvas
            ref={canvasRef}
            style={{
              display: "none",
            }}
          />

          {liveResult && (
            <div
              className="detection-result"
              style={{
                marginTop: "20px",
              }}
            >
              <h3>
                Live Detection Result
              </h3>

              <pre>
                {JSON.stringify(
                  liveResult.detections,
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          <div
            style={{
              marginTop: "25px",
              padding: "18px",
              borderRadius: "10px",
              background: "#f8f3ea",
              border: "1px solid #e4d9c9",
            }}
          >
            <strong>
              Future Enhancement
            </strong>

            <p
              className="hint-text"
              style={{
                marginBottom: 0,
              }}
            >
              External wildlife monitoring
              devices can be connected to this
              Live Detection module later. For
              now, the browser camera is used.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;