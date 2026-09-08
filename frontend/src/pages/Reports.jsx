import { useEffect, useMemo, useState } from "react";
import { getSurveyReport, getSurveys } from "../api";

export default function Reports({ token }) {
  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [surveysLoading, setSurveysLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setSurveysLoading(true);
        setError("");

        const response = await getSurveys(token);
        const data = Array.isArray(response.data) ? response.data : [];

        setSurveys(data);

        if (data.length > 0) {
          setSelectedSurveyId(String(data[0].id));
        }
      } catch (err) {
        console.error("Failed to load surveys:", err);
        setError("Unable to load surveys.");
      } finally {
        setSurveysLoading(false);
      }
    };

    if (token) {
      loadSurveys();
    }
  }, [token]);

  useEffect(() => {
    const loadReport = async () => {
      if (!selectedSurveyId || !token) {
        setReport(null);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getSurveyReport(
          selectedSurveyId,
          token
        );

        setReport(response.data);
      } catch (err) {
        console.error("Failed to load report:", err);
        setReport(null);
        setError("Unable to generate the selected survey report.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedSurveyId, token]);

  const selectedSurvey = useMemo(
    () =>
      surveys.find(
        (survey) => String(survey.id) === String(selectedSurveyId)
      ),
    [surveys, selectedSurveyId]
  );

  const formatDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    return `${value}%`;
  };

  if (surveysLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>Loading surveys...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Wildlife Reports</h1>
          <p style={styles.subtitle}>
            Generate a consolidated intelligence report for a
            monitoring survey.
          </p>
        </div>

        <div style={styles.selectorContainer}>
          <label style={styles.label}>Select Survey</label>

          <select
            value={selectedSurveyId}
            onChange={(event) =>
              setSelectedSurveyId(event.target.value)
            }
            style={styles.select}
          >
            {surveys.length === 0 ? (
              <option value="">No surveys available</option>
            ) : (
              surveys.map((survey, index) => (
                <option
                  key={survey.id}
                  value={survey.id}
                >
                  Survey #{index + 1} —{" "}
                  {survey.monitoring_location}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {!report && !loading && !error && (
        <div style={styles.emptyCard}>
          Select a survey to generate its report.
        </div>
      )}

      {loading && (
        <div style={styles.loadingCard}>
          Generating wildlife intelligence report...
        </div>
      )}

      {report && !loading && (
        <>
          <div style={styles.reportHeader}>
            <div>
              <div style={styles.reportBadge}>
                WILDLIFE INTELLIGENCE REPORT
              </div>

              <h2 style={styles.locationTitle}>
                {report.survey.monitoring_location}
              </h2>

              <p style={styles.meta}>
                {report.survey.habitat_type} •{" "}
                {report.survey.protected_area}
              </p>

              <p style={styles.meta}>
                Survey date:{" "}
                {formatDate(report.survey.survey_date)}
              </p>
            </div>

            <div style={styles.coordinates}>
              <strong>Coordinates</strong>
              <div>
                {report.survey.latitude},{" "}
                {report.survey.longitude}
              </div>
            </div>
          </div>

          <div style={styles.metricGrid}>
            <MetricCard
              label="Observations"
              value={report.summary.total_observations}
            />

            <MetricCard
              label="Recorded Population"
              value={report.summary.total_population}
            />

            <MetricCard
              label="Unique Species"
              value={report.summary.unique_species}
            />

            <MetricCard
              label="Avg. Confidence"
              value={`${report.summary.average_confidence}%`}
            />

            <MetricCard
              label="Image Observations"
              value={report.summary.image_observations}
            />

            <MetricCard
              label="Audio Observations"
              value={report.summary.audio_observations}
            />
          </div>

          <div style={styles.twoColumn}>
            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>
                Biodiversity Analysis
              </h3>

              <div style={styles.bigNumber}>
                {report.biodiversity.shannon_diversity_index}
              </div>

              <div style={styles.smallLabel}>
                Shannon Diversity Index
              </div>

              <div style={styles.infoRow}>
                <span>Unique species</span>
                <strong>
                  {report.biodiversity.unique_species}
                </strong>
              </div>
            </section>

            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>
                Ecosystem Health
              </h3>

              <div style={styles.healthScore}>
                {report.ecosystem.health_score}
              </div>

              <div
                style={{
                  ...styles.statusBadge,
                  ...(report.ecosystem.conservation_status ===
                  "Healthy"
                    ? styles.healthy
                    : styles.warning),
                }}
              >
                {report.ecosystem.conservation_status}
              </div>

              <p style={styles.recommendation}>
                {report.recommendations?.[0] ||
                  "No recommendation available."}
              </p>
            </section>
          </div>

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>
              Species Population Distribution
            </h3>

            {Object.keys(
              report.species.population_by_species || {}
            ).length === 0 ? (
              <p style={styles.muted}>
                No species observations recorded.
              </p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Species</th>
                      <th style={styles.th}>Population</th>
                      <th style={styles.th}>Distribution</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Object.entries(
                      report.species.population_by_species
                    ).map(([species, count]) => (
                      <tr key={species}>
                        <td style={styles.td}>{species}</td>
                        <td style={styles.td}>{count}</td>
                        <td style={styles.td}>
                          {formatPercentage(
                            report.species.distribution?.[
                              species
                            ]
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>
              Population Trends
            </h3>

            <p style={styles.muted}>
              {report.population_trends.status}
            </p>

            {report.population_trends.trends?.length > 0 ? (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Species</th>
                      <th style={styles.th}>Previous</th>
                      <th style={styles.th}>Current</th>
                      <th style={styles.th}>Change</th>
                      <th style={styles.th}>Trend</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.population_trends.trends.map(
                      (item) => (
                        <tr key={item.species}>
                          <td style={styles.td}>
                            {item.species}
                          </td>
                          <td style={styles.td}>
                            {item.previous_population}
                          </td>
                          <td style={styles.td}>
                            {item.current_population}
                          </td>
                          <td style={styles.td}>
                            {item.percentage_change === null
                              ? "New"
                              : `${item.percentage_change}%`}
                          </td>
                          <td style={styles.td}>
                            {item.trend}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.insufficient}>
                Historical comparison is not available for
                this survey.
              </div>
            )}
          </section>

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>
              Detection Sources
            </h3>

            <div style={styles.sourceGrid}>
              <SourceItem
                label="Image"
                value={report.detection_sources.image}
              />

              <SourceItem
                label="Audio"
                value={report.detection_sources.audio}
              />

              <SourceItem
                label="Other"
                value={report.detection_sources.other}
              />
            </div>
          </section>

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>
              Methodology & Limitations
            </h3>

            <div style={styles.notes}>
              <p>
                <strong>Population:</strong>{" "}
                {report.methodology.population_note}
              </p>

              <p>
                <strong>Ecosystem:</strong>{" "}
                {report.methodology.ecosystem_note}
              </p>

              <p>
                <strong>Confidence:</strong>{" "}
                {report.methodology.confidence_note}
              </p>
            </div>
          </section>

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>
              Recent Observations
            </h3>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Species</th>
                    <th style={styles.th}>Confidence</th>
                    <th style={styles.th}>Count</th>
                    <th style={styles.th}>Source</th>
                    <th style={styles.th}>Detected</th>
                  </tr>
                </thead>

                <tbody>
                  {report.observations.map((observation) => (
                    <tr key={observation.id}>
                      <td style={styles.td}>
                        {observation.species}
                      </td>
                      <td style={styles.td}>
                        {formatPercentage(
                          observation.confidence
                        )}
                      </td>
                      <td style={styles.td}>
                        {observation.count}
                      </td>
                      <td style={styles.td}>
                        {observation.source_type}
                      </td>
                      <td style={styles.td}>
                        {formatDate(
                          observation.created_at
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {selectedSurvey && !report && !loading && !error && (
        <div style={styles.emptyCard}>
          No report data is available for the selected survey.
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function SourceItem({ label, value }) {
  return (
    <div style={styles.sourceItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    padding: "32px",
    maxWidth: "1400px",
    margin: "0 auto",
    color: "#172033",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "24px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 750,
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#667085",
    fontSize: "15px",
  },

  selectorContainer: {
    minWidth: "300px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: 650,
  },

  select: {
    width: "100%",
    padding: "11px 13px",
    border: "1px solid #d0d5dd",
    borderRadius: "9px",
    background: "#fff",
    fontSize: "14px",
    outline: "none",
  },

  error: {
    padding: "14px 16px",
    marginBottom: "20px",
    borderRadius: "10px",
    background: "#fff1f0",
    border: "1px solid #f5c2c0",
    color: "#b42318",
  },

  loadingCard: {
    padding: "40px",
    textAlign: "center",
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: "14px",
  },

  emptyCard: {
    padding: "40px",
    textAlign: "center",
    color: "#667085",
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: "14px",
  },

  reportHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    padding: "24px",
    marginBottom: "20px",
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: "14px",
  },

  reportBadge: {
    display: "inline-block",
    marginBottom: "10px",
    fontSize: "11px",
    fontWeight: 750,
    letterSpacing: "0.08em",
    color: "#475467",
  },

  locationTitle: {
    margin: 0,
    fontSize: "25px",
  },

  meta: {
    margin: "7px 0 0",
    color: "#667085",
    fontSize: "14px",
  },

  coordinates: {
    minWidth: "180px",
    color: "#475467",
    fontSize: "13px",
    lineHeight: 1.7,
  },

  metricGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "14px",
    marginBottom: "20px",
  },

  metricCard: {
    padding: "20px",
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: "14px",
  },

  metricLabel: {
    color: "#667085",
    fontSize: "13px",
    marginBottom: "10px",
  },

  metricValue: {
    fontSize: "26px",
    fontWeight: 750,
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    marginBottom: "20px",
  },

  card: {
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: "0 0 20px",
    fontSize: "18px",
    fontWeight: 700,
  },

  bigNumber: {
    fontSize: "42px",
    fontWeight: 800,
    marginBottom: "4px",
  },

  healthScore: {
    fontSize: "42px",
    fontWeight: 800,
    marginBottom: "10px",
  },

  smallLabel: {
    color: "#667085",
    fontSize: "13px",
    marginBottom: "20px",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: "14px",
    borderTop: "1px solid #eaecf0",
    color: "#475467",
  },

  statusBadge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
  },

  healthy: {
    background: "#ecfdf3",
    color: "#027a48",
  },

  warning: {
    background: "#fffaeb",
    color: "#b54708",
  },

  recommendation: {
    margin: "18px 0 0",
    color: "#475467",
    lineHeight: 1.6,
    fontSize: "14px",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },

  th: {
    textAlign: "left",
    padding: "12px 10px",
    borderBottom: "1px solid #d0d5dd",
    color: "#475467",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #eaecf0",
    color: "#344054",
  },

  muted: {
    color: "#667085",
    fontSize: "14px",
  },

  insufficient: {
    padding: "15px",
    borderRadius: "9px",
    background: "#f8f9fb",
    color: "#667085",
    fontSize: "14px",
  },

  sourceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
  },

  sourceItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px",
    background: "#f8f9fb",
    borderRadius: "10px",
    color: "#475467",
  },

  notes: {
    color: "#475467",
    fontSize: "13px",
    lineHeight: 1.7,
  },
};