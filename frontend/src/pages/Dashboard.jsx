import { useEffect, useState, useMemo } from "react";
import {
  getObservations,
  getBiodiversity,
  getPopulationTrends,
} from "../api";

function Dashboard({ token, surveys = [], userInfo = null }) {
  const [observations, setObservations] = useState([]);
  const [biodiversity, setBiodiversity] = useState(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [populationTrends, setPopulationTrends] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  useEffect(() => {
    if (!token) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const observationResponse = await getObservations(token);
        const observationData = Array.isArray(observationResponse.data)
          ? observationResponse.data
          : [];

        setObservations(observationData);

        if (surveys.length > 0) {
          const firstSurveyId = surveys[0].id;
          setSelectedSurveyId(String(firstSurveyId));

          try {
            const biodiversityResponse = await getBiodiversity(
              firstSurveyId,
              token
            );

            setBiodiversity(biodiversityResponse.data);
            await loadPopulationTrends(firstSurveyId);
          } catch (biodiversityError) {
            console.error(
              "Failed to load biodiversity information:",
              biodiversityError
            );
          }
        }
      } catch (err) {
        console.error("Dashboard loading failed:", err);
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token, surveys]);
const loadPopulationTrends = async (surveyId) => {
  if (!surveyId || !token) {
    setPopulationTrends(null);
    return;
  }

  try {
    setTrendLoading(true);

    const response = await getPopulationTrends(
      Number(surveyId),
      token
    );

    setPopulationTrends(response.data);
  } catch (err) {
    console.error("Failed to load population trends:", err);
    setPopulationTrends(null);
  } finally {
    setTrendLoading(false);
  }
};
  const handleSurveyChange = async (event) => {
    const surveyId = event.target.value;

    setSelectedSurveyId(surveyId);

    if (!surveyId || !token) return;

    try {
      const response = await getBiodiversity(Number(surveyId), token);
      setBiodiversity(response.data);
      await loadPopulationTrends(Number(surveyId));
    } catch (err) {
      console.error("Failed to load biodiversity:", err);
    }
  };

  const selectedSurveyObservations = useMemo(() => {
    if (!selectedSurveyId) {
      return observations;
    }

    return observations.filter(
      (observation) =>
        String(observation.survey_id) === String(selectedSurveyId)
    );
  }, [observations, selectedSurveyId]);

  const speciesStats = useMemo(() => {
    const map = {};

    selectedSurveyObservations.forEach((observation) => {
      const species = observation.species_detected || "Unknown";
      const count = Number(observation.count || 1);

      if (!map[species]) {
        map[species] = {
          name: species,
          count: 0,
          detections: 0,
          confidenceTotal: 0,
          confidenceCount: 0,
        };
      }

      map[species].count += count;
      map[species].detections += 1;

      if (typeof observation.confidence === "number") {
        map[species].confidenceTotal += observation.confidence;
        map[species].confidenceCount += 1;
      }
    });

    return Object.values(map)
      .map((species) => ({
        ...species,
        averageConfidence:
          species.confidenceCount > 0
            ? species.confidenceTotal / species.confidenceCount
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedSurveyObservations]);

  const totalSurveys = surveys.length;
  const totalObservations = selectedSurveyObservations.length;

  const totalPopulation = selectedSurveyObservations.reduce(
    (total, observation) =>
      total + Number(observation.count || 1),
    0
  );

  const uniqueSpecies = speciesStats.filter(
    (species) => species.name !== "Unknown"
  ).length;

  const averageConfidence =
    selectedSurveyObservations.length > 0
      ? selectedSurveyObservations.reduce((total, observation) => {
          const confidence = Number(observation.confidence || 0);
          return total + confidence;
        }, 0) / selectedSurveyObservations.length
      : 0;

  const highConfidenceCount = selectedSurveyObservations.filter(
    (observation) => Number(observation.confidence || 0) >= 0.8
  ).length;

  const reviewCount = selectedSurveyObservations.filter(
    (observation) => Number(observation.confidence || 0) < 0.8
  ).length;

  const mostDetectedSpecies =
    speciesStats.length > 0 ? speciesStats[0].name : "No detections yet";

  const selectedSurvey = surveys.find(
    (survey) => String(survey.id) === String(selectedSurveyId)
  );

  const formatConfidence = (confidence) => {
    const value = Number(confidence || 0);

    if (value <= 1) {
      return `${(value * 100).toFixed(1)}%`;
    }

    return `${value.toFixed(1)}%`;
  };

  const confidenceAsPercentage = (confidence) => {
    const value = Number(confidence || 0);

    return value <= 1 ? value * 100 : value;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getHealthScore = () => {
    if (!biodiversity) return 0;

    return Number(
      biodiversity.ecosystem_health_score ??
        biodiversity.health_score ??
        0
    );
  };

  const getHealthStatus = () => {
    if (!biodiversity) return "Awaiting data";

    return (
      biodiversity.conservation_status ??
      biodiversity.status ??
      "Unknown"
    );
  };

  const healthScore = getHealthScore();

  const getHealthClass = () => {
    if (healthScore >= 85) return "excellent";
    if (healthScore >= 70) return "healthy";
    if (healthScore >= 50) return "moderate";
    if (healthScore >= 30) return "vulnerable";
    return "critical";
  };

  const recentObservations = [...selectedSurveyObservations]
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      return dateB - dateA;
    })
    .slice(0, 8);

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading wildlife intelligence...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <style>{`
        .dashboard-page {
          width: 100%;
        }

        .dashboard-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .dashboard-title {
          margin: 0;
          font-size: 2rem;
          color: #2a241c;
        }

        .dashboard-subtitle {
          margin: 8px 0 0;
          color: #6f665b;
          font-size: 0.95rem;
        }

        .dashboard-role {
          display: inline-block;
          margin-top: 12px;
          padding: 6px 12px;
          border-radius: 999px;
          background: #e6f1f3;
          color: #1b6b7d;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .survey-selector {
          min-width: 230px;
        }

        .survey-selector label {
          display: block;
          margin-bottom: 7px;
          color: #6f665b;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .survey-selector select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d9cdbb;
          border-radius: 8px;
          background: #fffdf8;
          color: #2a241c;
          font-size: 0.95rem;
        }

        .dashboard-error {
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 10px;
          background: #f9e5e0;
          border: 1px solid #dfb0a6;
          color: #8d2e22;
        }

        .dashboard-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .dashboard-stat {
          padding: 20px;
          border: 1px solid #dfd3c1;
          border-radius: 12px;
          background: #fffdf8;
        }

        .dashboard-stat-label {
          color: #766c60;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .dashboard-stat-value {
          margin-top: 8px;
          color: #c97a1f;
          font-size: 2rem;
          font-weight: 800;
        }

        .dashboard-stat-detail {
          margin-top: 4px;
          color: #7d7367;
          font-size: 0.78rem;
        }

        .dashboard-two-column {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 18px;
          margin-bottom: 20px;
        }

        .dashboard-panel {
          padding: 22px;
          border: 1px solid #dfd3c1;
          border-radius: 12px;
          background: #fffdf8;
        }

        .dashboard-panel-title {
          margin: 0;
          color: #2a241c;
          font-size: 1.1rem;
        }

        .dashboard-panel-subtitle {
          margin: 5px 0 18px;
          color: #81766a;
          font-size: 0.82rem;
        }

        .health-layout {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .health-score-circle {
          width: 135px;
          height: 135px;
          flex: 0 0 135px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 10px solid #dce9eb;
          background: #f8fbfb;
        }

        .health-score-number {
          font-size: 2rem;
          font-weight: 800;
          color: #1b6b7d;
        }

        .health-score-label {
          font-size: 0.7rem;
          color: #777066;
          text-transform: uppercase;
        }

        .health-details {
          flex: 1;
        }

        .health-status {
          display: inline-block;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .health-status.excellent,
        .health-status.healthy {
          background: #e5f2e8;
          color: #26723a;
        }

        .health-status.moderate {
          background: #fff0d9;
          color: #9b5d0e;
        }

        .health-status.vulnerable,
        .health-status.critical {
          background: #f9e5e0;
          color: #8d2e22;
        }

        .health-metric {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 12px;
          padding-bottom: 9px;
          border-bottom: 1px solid #eee5d9;
        }

        .health-metric span:first-child {
          color: #766c60;
        }

        .health-metric strong {
          color: #2a241c;
        }

        .species-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .species-row {
          display: grid;
          grid-template-columns: minmax(100px, 1fr) 55px 80px;
          gap: 12px;
          align-items: center;
        }

        .species-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
          color: #2a241c;
        }

        .species-count {
          color: #766c60;
          font-size: 0.82rem;
          text-align: right;
        }

        .confidence-track {
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: #eee5d9;
        }

        .confidence-fill {
          height: 100%;
          border-radius: inherit;
          background: #c97a1f;
        }

        .species-confidence {
          color: #1b6b7d;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.78rem;
          text-align: right;
        }

        .distribution-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .distribution-row {
          display: grid;
          grid-template-columns: minmax(130px, 1fr) 1fr 65px;
          gap: 12px;
          align-items: center;
        }

        .distribution-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #2a241c;
          font-size: 0.84rem;
          font-weight: 600;
        }

        .distribution-track {
          height: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: #eee5d9;
        }

        .distribution-fill {
          height: 100%;
          border-radius: inherit;
          background: #1b6b7d;
        }

        .distribution-value {
          color: #1b6b7d;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.78rem;
          font-weight: 700;
          text-align: right;
        }

        .observation-table-wrapper {
          overflow-x: auto;
        }

        .observation-table {
          width: 100%;
          border-collapse: collapse;
        }

        .observation-table th {
          padding: 11px 10px;
          border-bottom: 2px solid #e2d6c5;
          color: #756b5f;
          font-size: 0.72rem;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .observation-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #eee5d9;
          color: #40392f;
          font-size: 0.86rem;
        }

        .species-tag {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          background: #f6ead8;
          color: #895512;
          font-weight: 700;
        }

        .confidence-good {
          color: #28723b;
          font-weight: 700;
        }

        .confidence-review {
          color: #9b5d0e;
          font-weight: 700;
        }

        .monitoring-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .summary-item {
          padding: 14px;
          border-radius: 9px;
          background: #f8f3ea;
          border: 1px solid #e6dccd;
        }

        .summary-label {
          display: block;
          color: #766c60;
          font-size: 0.74rem;
        }

        .summary-value {
          display: block;
          margin-top: 6px;
          color: #2a241c;
          font-size: 1rem;
          font-weight: 800;
        }

        .empty-state {
          padding: 30px;
          text-align: center;
          color: #7b7268;
        }

        .dashboard-loading {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6f665b;
        }

        .loading-spinner {
          width: 34px;
          height: 34px;
          margin-bottom: 12px;
          border: 4px solid #e2d6c5;
          border-top-color: #c97a1f;
          border-radius: 50%;
          animation: dashboard-spin 0.8s linear infinite;
        }

        @keyframes dashboard-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .dashboard-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-two-column {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .dashboard-stat-grid {
            grid-template-columns: 1fr;
          }

          .health-layout {
            flex-direction: column;
            align-items: flex-start;
          }

          .monitoring-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dashboard-hero">
        <div>
          <h1 className="dashboard-title">
            Wildlife Intelligence Dashboard
          </h1>

          <p className="dashboard-subtitle">
            AI-powered monitoring of species, confidence, biodiversity and
            ecosystem health.
          </p>

          {userInfo?.role && (
            <span className="dashboard-role">{userInfo.role}</span>
          )}
        </div>

        {surveys.length > 0 && (
          <div className="survey-selector">
            <label htmlFor="dashboard-survey">
              Ecosystem Health Survey
            </label>

            <select
              id="dashboard-survey"
              value={selectedSurveyId}
              onChange={handleSurveyChange}
            >
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.monitoring_location || "Unnamed Survey"} (ID:{" "}
                  {survey.id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="dashboard-stat-grid">
        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Total Surveys</div>
          <div className="dashboard-stat-value">{totalSurveys}</div>
          <div className="dashboard-stat-detail">
            Registered monitoring locations
          </div>
        </div>

        <div className="dashboard-stat">
          <div className="dashboard-stat-label">AI Observations</div>
          <div className="dashboard-stat-value">
            {totalObservations}
          </div>
          <div className="dashboard-stat-detail">
            Image and audio detections
          </div>
        </div>

        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Species Detected</div>
          <div className="dashboard-stat-value">{uniqueSpecies}</div>
          <div className="dashboard-stat-detail">
            Unique species identified
          </div>
        </div>

        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Estimated Population</div>
          <div className="dashboard-stat-value">{totalPopulation}</div>
          <div className="dashboard-stat-detail">
            Animals represented by observations
          </div>
        </div>

        <div className="dashboard-stat">
          <div className="dashboard-stat-label">Avg Confidence</div>
          <div className="dashboard-stat-value">
            {formatConfidence(averageConfidence)}
          </div>
          <div className="dashboard-stat-detail">
            For the selected survey
          </div>
        </div>
      </div>

      <div className="dashboard-two-column">
        <div className="dashboard-panel">
          <h2 className="dashboard-panel-title">
            Ecosystem Health
          </h2>

          <p className="dashboard-panel-subtitle">
            Biodiversity assessment for{" "}
            {selectedSurvey?.monitoring_location || "the selected survey"}
          </p>

          <div className="health-layout">
            <div className="health-score-circle">
              <div className="health-score-number">
                {healthScore.toFixed(1)}
              </div>

              <div className="health-score-label">Score / 100</div>
            </div>

            <div className="health-details">
              <span
                className={`health-status ${getHealthClass()}`}
              >
                {getHealthStatus()}
              </span>

              <div className="health-metric">
                <span>Shannon Diversity</span>

                <strong>
                  {Number(
                    biodiversity?.shannon_diversity_index ?? 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="health-metric">
                <span>Unique Species</span>

                <strong>
                  {biodiversity?.unique_species ?? uniqueSpecies}
                </strong>
              </div>

              <div className="health-metric">
                <span>Total Observations</span>

                <strong>
                  {biodiversity?.total_observations ??
                    totalObservations}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <h2 className="dashboard-panel-title">
            Detected Species
          </h2>

          <p className="dashboard-panel-subtitle">
            Species frequency and average AI confidence
          </p>

          {speciesStats.length === 0 ? (
            <div className="empty-state">
              No wildlife detections available yet.
            </div>
          ) : (
            <div className="species-list">
              {speciesStats.slice(0, 6).map((species) => {
                const confidence = species.averageConfidence;
                const percentage = Math.min(
                  100,
                  confidenceAsPercentage(confidence)
                );

                return (
                  <div
                    className="species-row"
                    key={species.name}
                  >
                    <span className="species-name">
                      {species.name}
                    </span>

                    <span className="species-count">
                      {species.count}{" "}
                      {species.count === 1
                        ? "detection"
                        : "detections"}
                    </span>

                    <div>
                      <div className="confidence-track">
                        <div
                          className="confidence-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="species-confidence">
                        {formatConfidence(confidence)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-panel" style={{ marginBottom: "20px" }}>
        <h2 className="dashboard-panel-title">
          Species Distribution
        </h2>

        <p className="dashboard-panel-subtitle">
          Population composition for{" "}
          {selectedSurvey?.monitoring_location || "the selected survey"}
        </p>

        {Object.keys(biodiversity?.species_distribution || {}).length === 0 ? (
          <div className="empty-state">
            No species distribution data available for this survey.
          </div>
        ) : (
          <div className="distribution-list">
            {Object.entries(biodiversity.species_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([species, percentage]) => (
                <div className="distribution-row" key={species}>
                  <span className="distribution-name">{species}</span>

                  <div className="distribution-track">
                    <div
                      className="distribution-fill"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, Number(percentage) || 0)
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="distribution-value">
                    {Number(percentage || 0).toFixed(2)}%
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="dashboard-panel" style={{ marginBottom: "20px" }}>
        <h2 className="dashboard-panel-title">
          Recent AI Detections
                <div className="dashboard-panel" style={{ marginBottom: "20px" }}>
        <h2 className="dashboard-panel-title">
          Population Trends
        </h2>

        <p className="dashboard-panel-subtitle">
          Species population changes compared with the previous survey at the
          same monitoring location
        </p>

        {trendLoading ? (
          <div className="empty-state">
            Calculating population trends...
          </div>
        ) : !populationTrends ||
          populationTrends.status !== "Trend Available" ||
          !populationTrends.trends?.length ? (
          <div className="empty-state">
            {populationTrends?.message ||
              "A previous survey is required to calculate population trends."}
          </div>
        ) : (
          <div className="observation-table-wrapper">
            <table className="observation-table">
              <thead>
                <tr>
                  <th>Species</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Change</th>
                  <th>Trend</th>
                </tr>
              </thead>

              <tbody>
                {populationTrends.trends.map((trend) => {
                  const percentage =
                    trend.percentage_change === null
                      ? "New"
                      : `${Number(
                          trend.percentage_change
                        ).toFixed(2)}%`;

                  let trendSymbol = "→";
                  let trendClass = "confidence-review";

                  if (trend.trend === "Increasing") {
                    trendSymbol = "↑";
                    trendClass = "confidence-good";
                  } else if (trend.trend === "Decreasing") {
                    trendSymbol = "↓";
                    trendClass = "confidence-review";
                  }

                  return (
                    <tr key={trend.species}>
                      <td>
                        <span className="species-tag">
                          {trend.species}
                        </span>
                      </td>

                      <td>
                        {trend.previous_population}
                      </td>

                      <td>
                        {trend.current_population}
                      </td>

                      <td>
                        {trend.change > 0 ? "+" : ""}
                        {trend.change}{" "}
                        ({percentage})
                      </td>

                      <td className={trendClass}>
                        {trendSymbol} {trend.trend}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              style={{
                marginTop: "14px",
                fontSize: "0.78rem",
                color: "#81766a",
              }}
            >
              Previous survey ID: #
              {populationTrends.previous_survey_id}
            </div>
          </div>
        )}
      </div>
        </h2>

        <p className="dashboard-panel-subtitle">
          Latest wildlife observations recorded by the monitoring system
        </p>

        {recentObservations.length === 0 ? (
          <div className="empty-state">
            No observations have been recorded yet.
          </div>
        ) : (
          <div className="observation-table-wrapper">
            <table className="observation-table">
              <thead>
                <tr>
                  <th>Species</th>
                  <th>Confidence</th>
                  <th>Survey</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {recentObservations.map((observation) => {
                  const confidencePercentage =
                    confidenceAsPercentage(observation.confidence);

                  const confidenceClass =
                    confidencePercentage >= 80
                      ? "confidence-good"
                      : "confidence-review";

                  return (
                    <tr key={observation.id}>
                      <td>
                        <span className="species-tag">
                          {observation.species_detected ||
                            "Unknown species"}
                        </span>
                      </td>

                      <td className={confidenceClass}>
                        {formatConfidence(
                          observation.confidence
                        )}
                      </td>

                      <td>
                        #{observation.survey_id ?? "—"}
                      </td>

                      <td>
                        {formatDate(observation.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard-panel">
        <h2 className="dashboard-panel-title">
          AI Monitoring Summary
        </h2>

        <p className="dashboard-panel-subtitle">
          Quick operational view of the current wildlife detection data
        </p>

        <div className="monitoring-summary">
          <div className="summary-item">
            <span className="summary-label">
              High-confidence detections
            </span>

            <span className="summary-value">
              {highConfidenceCount}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">
              Detections needing review
            </span>

            <span className="summary-value">
              {reviewCount}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">
              Most detected species
            </span>

            <span className="summary-value">
              {mostDetectedSpecies}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;