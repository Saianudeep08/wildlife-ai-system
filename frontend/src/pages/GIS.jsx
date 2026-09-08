import { useEffect, useMemo, useState } from "react";
import { getObservations, getSurveys } from "../api";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

// Fix Leaflet marker icons when used with Vite.
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (!locations.length) {
      return;
    }

    const bounds = L.latLngBounds(
      locations.map((location) => [
        location.latitude,
        location.longitude,
      ])
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 12,
    });
  }, [locations, map]);

  return null;
}

export default function GIS({ token }) {
  const [surveys, setSurveys] = useState([]);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadGISData = async () => {
      if (!token) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [surveyResponse, observationResponse] =
          await Promise.all([
            getSurveys(token),
            getObservations(token),
          ]);

        setSurveys(
          Array.isArray(surveyResponse.data)
            ? surveyResponse.data
            : []
        );

        setObservations(
          Array.isArray(observationResponse.data)
            ? observationResponse.data
            : []
        );
      } catch (err) {
        console.error("Failed to load GIS data:", err);
        setError(
          "Unable to load survey locations and observations."
        );
      } finally {
        setLoading(false);
      }
    };

    loadGISData();
  }, [token]);

  const locations = useMemo(() => {
    return surveys
      .map((survey, index) => {
        const latitude = Number(survey.latitude);
        const longitude = Number(survey.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        const surveyObservations = observations.filter(
          (observation) =>
            Number(observation.survey_id) ===
            Number(survey.id)
        );

        const species = [
          ...new Set(
            surveyObservations
              .map(
                (observation) =>
                  observation.species_detected
              )
              .filter(Boolean)
          ),
        ];

        return {
          id: survey.id,
          number: index + 1,
          monitoring_location:
            survey.monitoring_location ||
            "Unknown location",
          latitude,
          longitude,
          habitat_type:
            survey.habitat_type || "Not specified",
          protected_area:
            survey.protected_area || "Not specified",
          survey_date: survey.survey_date,
          observation_count:
            surveyObservations.length,
          species,
        };
      })
      .filter(Boolean);
  }, [surveys, observations]);

  const totalObservations = observations.length;

  const speciesCount = new Set(
    observations
      .map(
        (observation) =>
          observation.species_detected
      )
      .filter(Boolean)
  ).size;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          Loading GIS visualization...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Wildlife GIS Visualization
          </h1>

          <p style={styles.subtitle}>
            Geographic view of wildlife monitoring surveys
            and recorded observations.
          </p>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.metricGrid}>
        <MetricCard
          label="Survey Locations"
          value={locations.length}
        />

        <MetricCard
          label="Total Observations"
          value={totalObservations}
        />

        <MetricCard
          label="Species Recorded"
          value={speciesCount}
        />
      </div>

      <section style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Monitoring Locations
            </h2>

            <p style={styles.sectionSubtitle}>
              Select a marker to view survey information.
            </p>
          </div>
        </div>

        {locations.length === 0 ? (
          <div style={styles.empty}>
            No survey locations with valid coordinates are
            available.
          </div>
        ) : (
          <div style={styles.mapWrapper}>
            <MapContainer
              center={[
                locations[0].latitude,
                locations[0].longitude,
              ]}
              zoom={6}
              scrollWheelZoom={true}
              style={styles.map}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBounds locations={locations} />

              {locations.map((location) => (
                <Marker
                  key={location.id}
                  position={[
                    location.latitude,
                    location.longitude,
                  ]}
                >
                  <Popup>
                    <div style={styles.popup}>
                      <h3 style={styles.popupTitle}>
                        Survey #{location.number}
                      </h3>

                      <p>
                        <strong>Location:</strong>{" "}
                        {location.monitoring_location}
                      </p>

                      <p>
                        <strong>Habitat:</strong>{" "}
                        {location.habitat_type}
                      </p>

                      <p>
                        <strong>Protected Area:</strong>{" "}
                        {location.protected_area}
                      </p>

                      <p>
                        <strong>Coordinates:</strong>{" "}
                        {location.latitude},{" "}
                        {location.longitude}
                      </p>

                      <p>
                        <strong>Observations:</strong>{" "}
                        {location.observation_count}
                      </p>

                      <p>
                        <strong>Species:</strong>{" "}
                        {location.species.length > 0
                          ? location.species.join(", ")
                          : "No species recorded"}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>
          Survey Location Summary
        </h2>

        {locations.length === 0 ? (
          <p style={styles.muted}>
            No survey locations available.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    Survey
                  </th>

                  <th style={styles.th}>
                    Location
                  </th>

                  <th style={styles.th}>
                    Habitat
                  </th>

                  <th style={styles.th}>
                    Protected Area
                  </th>

                  <th style={styles.th}>
                    Coordinates
                  </th>

                  <th style={styles.th}>
                    Observations
                  </th>
                </tr>
              </thead>

              <tbody>
                {locations.map((location) => (
                  <tr key={location.id}>
                    <td style={styles.td}>
                      Survey #{location.number}
                    </td>

                    <td style={styles.td}>
                      {location.monitoring_location}
                    </td>

                    <td style={styles.td}>
                      {location.habitat_type}
                    </td>

                    <td style={styles.td}>
                      {location.protected_area}
                    </td>

                    <td style={styles.td}>
                      {location.latitude},{" "}
                      {location.longitude}
                    </td>

                    <td style={styles.td}>
                      {location.observation_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>
        {label}
      </div>

      <div style={styles.metricValue}>
        {value}
      </div>
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

  header: {
    marginBottom: "28px",
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

  metricGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
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
    fontSize: "28px",
    fontWeight: 750,
  },

  mapCard: {
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "20px",
  },

  mapHeader: {
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#667085",
    fontSize: "13px",
  },

  mapWrapper: {
    height: "560px",
    width: "100%",
    overflow: "hidden",
    borderRadius: "12px",
    border: "1px solid #d0d5dd",
  },

  map: {
    height: "100%",
    width: "100%",
  },

  card: {
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "20px",
  },

  tableWrapper: {
    overflowX: "auto",
    marginTop: "18px",
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

  empty: {
    padding: "40px",
    textAlign: "center",
    color: "#667085",
    background: "#f8f9fb",
    borderRadius: "10px",
  },

  muted: {
    color: "#667085",
    fontSize: "14px",
  },

  popup: {
    minWidth: "230px",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  popupTitle: {
    margin: "0 0 10px",
    fontSize: "16px",
  },
};