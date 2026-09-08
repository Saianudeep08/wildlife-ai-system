import { useMemo, useState } from "react";

function Surveys({
  surveys = [],
  observations = [],
  onCreateSurvey,
  onDeleteSurvey,
}) {
  const [search, setSearch] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState(null);

  const getObservationCount = (surveyId) => {
    return observations.filter(
      (observation) =>
        Number(observation.survey_id) === Number(surveyId)
    ).length;
  };

  const filteredSurveys = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return surveys;
    }

    return surveys.filter((survey) => {
      return (
        String(survey.id).includes(query) ||
        String(survey.monitoring_location || "")
          .toLowerCase()
          .includes(query) ||
        String(survey.habitat_type || "")
          .toLowerCase()
          .includes(query) ||
        String(survey.protected_area || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [surveys, search]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "Not available";

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

  const activeLocations = new Set(
    surveys
      .map((survey) => survey.monitoring_location)
      .filter(Boolean)
  ).size;

  return (
    <section className="surveys-page">
      <style>{`
        .surveys-page {
          width: 100%;
        }

        /* ================================
           HEADER
           ================================ */

        .surveys-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 26px;
          flex-wrap: wrap;
        }

        .surveys-header-left {
          flex: 1;
          min-width: 260px;
        }

        .surveys-title {
          margin: 0;
          color: #2a241c;
          font-size: 2rem;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .surveys-subtitle {
          margin: 9px 0 0;
          color: #746a5e;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .surveys-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .survey-search {
          width: 260px;
          min-width: 220px;
          padding: 12px 14px;
          border: 1px solid #d9cdbb;
          border-radius: 9px;
          background: #fffdf8;
          color: #2a241c;
          font-size: 0.9rem;
          outline: none;
          box-sizing: border-box;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .survey-search::placeholder {
          color: #9a9084;
        }

        .survey-search:focus {
          border-color: #1b6b7d;
          box-shadow: 0 0 0 3px rgba(27, 107, 125, 0.09);
        }

        /* ================================
           CREATE BUTTON
           ================================ */

        .create-survey-button {
          border: 1px solid #c56f16;
          border-radius: 9px;
          padding: 12px 17px;
          background: #c97a1f;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 750;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(150, 88, 24, 0.12);
          transition:
            background 0.15s ease,
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .create-survey-button:hover {
          background: #b86b17;
          transform: translateY(-1px);
          box-shadow: 0 7px 16px rgba(150, 88, 24, 0.17);
        }

        .create-survey-button:active {
          transform: translateY(0);
        }

        /* ================================
           SUMMARY
           ================================ */

        .survey-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }

        .survey-summary-card {
          position: relative;
          overflow: hidden;
          padding: 19px 20px;
          border: 1px solid #dfd3c1;
          border-radius: 12px;
          background: #fffdf8;
          box-shadow: 0 2px 8px rgba(50, 40, 30, 0.025);
        }

        .survey-summary-card::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: #c97a1f;
        }

        .survey-summary-label {
          color: #756b5f;
          font-size: 0.72rem;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .survey-summary-value {
          margin-top: 7px;
          color: #c97a1f;
          font-size: 1.85rem;
          line-height: 1;
          font-weight: 800;
        }

        /* ================================
           SURVEY GRID
           ================================ */

        .survey-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .survey-card {
          padding: 20px;
          border: 1px solid #dfd3c1;
          border-radius: 13px;
          background: #fffdf8;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .survey-card:hover {
          transform: translateY(-2px);
          border-color: #c9bda9;
          box-shadow: 0 10px 24px rgba(50, 40, 30, 0.08);
        }

        /* ================================
           CARD HEADER
           ================================ */

        .survey-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .survey-location {
          margin: 0;
          color: #2a241c;
          font-size: 1.22rem;
          line-height: 1.3;
        }

        .survey-card-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .survey-id {
          display: inline-flex;
          align-items: center;
          min-height: 29px;
          padding: 5px 9px;
          border-radius: 7px;
          background: #e8f1f2;
          color: #1b6b7d;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.7rem;
          font-weight: 750;
          letter-spacing: 0.02em;
        }

        /* ================================
           DELETE BUTTON
           ================================ */

        .survey-delete-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 29px;
          padding: 5px 10px;
          border: 1px solid #d8a39a;
          border-radius: 7px;
          background: #fff8f6;
          color: #a13b2e;
          font-size: 0.72rem;
          font-weight: 750;
          cursor: pointer;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;
        }

        .survey-delete-button:hover {
          background: #f8e6e2;
          border-color: #c97f73;
          color: #8d2e22;
        }

        /* ================================
           DETAILS
           ================================ */

        .survey-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 11px;
          margin-top: 20px;
        }

        .survey-detail {
          min-width: 0;
          padding: 12px;
          border: 1px solid #eee5d9;
          border-radius: 9px;
          background: #f8f3ea;
        }

        .survey-detail-label {
          display: block;
          color: #81776b;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .survey-detail-value {
          display: block;
          margin-top: 5px;
          color: #3d362e;
          font-size: 0.86rem;
          font-weight: 650;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        /* ================================
           FOOTER
           ================================ */

        .survey-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #eee5d9;
        }

        .observation-count {
          color: #6e655a;
          font-size: 0.79rem;
        }

        .view-survey {
          color: #1b6b7d;
          font-size: 0.8rem;
          font-weight: 750;
          white-space: nowrap;
        }

        .view-survey:hover {
          text-decoration: underline;
        }

        /* ================================
           EMPTY STATE
           ================================ */

        .empty-surveys {
          padding: 55px 20px;
          border: 1px dashed #d6c8b6;
          border-radius: 13px;
          text-align: center;
          color: #776d61;
          background: #fffdf8;
        }

        .empty-surveys-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f4eadb;
          color: #c97a1f;
          font-size: 1.2rem;
        }

        .empty-surveys h3 {
          margin: 0 0 8px;
          color: #40392f;
          font-size: 1.1rem;
        }

        .empty-surveys p {
          margin: 0;
          font-size: 0.88rem;
        }

        /* ================================
           VIEW SURVEY MODAL
           ================================ */

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(42, 36, 28, 0.48);
          box-sizing: border-box;
        }

        .survey-modal {
          width: min(650px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          padding: 28px;
          border: 1px solid #dfd3c1;
          border-radius: 16px;
          background: #fffdf8;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.25);
          box-sizing: border-box;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid #eee5d9;
        }

        .modal-header h2 {
          margin: 0;
          color: #2a241c;
          font-size: 1.45rem;
          line-height: 1.25;
        }

        .modal-location {
          margin-top: 5px;
          color: #81766a;
          font-size: 0.86rem;
        }

        .modal-close {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ddd1c0;
          border-radius: 8px;
          background: #f8f3ea;
          color: #5f574d;
          font-size: 1.05rem;
          cursor: pointer;
          flex-shrink: 0;
        }

        .modal-close:hover {
          background: #eee6da;
          color: #2a241c;
        }

        .modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 22px;
        }

        .modal-field {
          padding: 14px;
          border: 1px solid #e3d8c8;
          border-radius: 10px;
          background: #fffdf8;
        }

        .modal-field.full {
          grid-column: 1 / -1;
          background: #f8f3ea;
        }

        .modal-field-label {
          display: block;
          color: #7a7064;
          font-size: 0.68rem;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modal-field-value {
          display: block;
          margin-top: 6px;
          color: #2f2922;
          font-size: 0.92rem;
          font-weight: 650;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid #eee5d9;
        }

        .modal-button {
          padding: 10px 15px;
          border-radius: 8px;
          border: 1px solid #d7c9b6;
          background: #f7f0e6;
          color: #51483d;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.15s ease,
            border-color 0.15s ease;
        }

        .modal-button:hover {
          background: #eee5d8;
          border-color: #c8b9a5;
        }

        .modal-button.primary {
          border-color: #1b6b7d;
          background: #1b6b7d;
          color: #ffffff;
        }

        .modal-button.primary:hover {
          background: #155a69;
          border-color: #155a69;
        }

        /* ================================
           RESPONSIVE
           ================================ */

        @media (max-width: 850px) {
          .survey-grid {
            grid-template-columns: 1fr;
          }

          .survey-summary {
            grid-template-columns: 1fr;
          }

          .surveys-header {
            align-items: stretch;
          }

          .surveys-header-actions {
            width: 100%;
          }

          .survey-search {
            flex: 1;
            width: auto;
          }
        }

        @media (max-width: 600px) {
          .surveys-title {
            font-size: 1.65rem;
          }

          .surveys-header-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .survey-search,
          .create-survey-button {
            width: 100%;
          }

          .survey-card-header {
            flex-direction: column;
          }

          .survey-card-actions {
            width: 100%;
            justify-content: space-between;
          }

          .survey-details,
          .modal-grid {
            grid-template-columns: 1fr;
          }

          .modal-field.full {
            grid-column: auto;
          }

          .survey-modal {
            padding: 20px;
          }

          .modal-actions {
            flex-direction: column-reverse;
          }

          .modal-button {
            width: 100%;
          }
        }
      `}</style>

      {/* ================================
          PAGE HEADER
          ================================ */}

      <div className="surveys-header">
        <div className="surveys-header-left">
          <h1 className="surveys-title">
            Wildlife Surveys
          </h1>

          <p className="surveys-subtitle">
            Monitoring locations, habitats and field observations.
          </p>
        </div>

        <div className="surveys-header-actions">
          <input
            className="survey-search"
            type="text"
            placeholder="Search surveys..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {onCreateSurvey && (
            <button
              type="button"
              className="create-survey-button"
              onClick={onCreateSurvey}
            >
              + Create New Survey
            </button>
          )}
        </div>
      </div>

      {/* ================================
          SUMMARY CARDS
          ================================ */}

      <div className="survey-summary">
        <div className="survey-summary-card">
          <div className="survey-summary-label">
            Registered Surveys
          </div>

          <div className="survey-summary-value">
            {surveys.length}
          </div>
        </div>

        <div className="survey-summary-card">
          <div className="survey-summary-label">
            Total Observations
          </div>

          <div className="survey-summary-value">
            {observations.length}
          </div>
        </div>

        <div className="survey-summary-card">
          <div className="survey-summary-label">
            Active Locations
          </div>

          <div className="survey-summary-value">
            {activeLocations}
          </div>
        </div>
      </div>

      {/* ================================
          SURVEY LIST
          ================================ */}

      {filteredSurveys.length === 0 ? (
        <div className="empty-surveys">
          <div className="empty-surveys-icon">
            +
          </div>

          <h3>
            No surveys found
          </h3>

          <p>
            {search
              ? "Try a different search term."
              : "Create your first wildlife monitoring survey."}
          </p>
        </div>
      ) : (
        <div className="survey-grid">
          {filteredSurveys.map((survey, index) => (
            <article
              className="survey-card"
              key={survey.id}
              onClick={() => setSelectedSurvey(survey)}
            >
              {/* CARD HEADER */}

              <div className="survey-card-header">
                <div>
                  <h2 className="survey-location">
                    {survey.monitoring_location ||
                      "Unnamed monitoring site"}
                  </h2>
                </div>

                <div className="survey-card-actions">
                  <span className="survey-id">
                    SURVEY {index + 1}
                  </span>

                  {onDeleteSurvey && (
                    <button
                      type="button"
                      className="survey-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();

                        const confirmed = window.confirm(
                          `Delete the survey at "${
                            survey.monitoring_location ||
                            "this monitoring site"
                          }"?\n\nThis will also delete observations associated with this survey.`
                        );

                        if (confirmed) {
                          onDeleteSurvey(survey.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* SURVEY DETAILS */}

              <div className="survey-details">
                <div className="survey-detail">
                  <span className="survey-detail-label">
                    Habitat
                  </span>

                  <span className="survey-detail-value">
                    {survey.habitat_type || "Not specified"}
                  </span>
                </div>

                <div className="survey-detail">
                  <span className="survey-detail-label">
                    Protected Area
                  </span>

                  <span className="survey-detail-value">
                    {survey.protected_area || "Not specified"}
                  </span>
                </div>

                <div className="survey-detail">
                  <span className="survey-detail-label">
                    Latitude
                  </span>

                  <span className="survey-detail-value">
                    {survey.latitude ?? "Not available"}
                  </span>
                </div>

                <div className="survey-detail">
                  <span className="survey-detail-label">
                    Longitude
                  </span>

                  <span className="survey-detail-value">
                    {survey.longitude ?? "Not available"}
                  </span>
                </div>

                <div className="survey-detail">
                  <span className="survey-detail-label">
                    Survey Date
                  </span>

                  <span className="survey-detail-value">
                    {formatDate(survey.survey_date)}
                  </span>
                </div>

                <div className="survey-detail">
                  <span className="survey-detail-label">
                    AI Observations
                  </span>

                  <span className="survey-detail-value">
                    {getObservationCount(survey.id)}
                  </span>
                </div>
              </div>

              {/* CARD FOOTER */}

              <div className="survey-footer">
                <span className="observation-count">
                  {getObservationCount(survey.id)} AI detections recorded
                </span>

                <span className="view-survey">
                  View survey →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ================================
          VIEW SURVEY MODAL
          ================================ */}

      {selectedSurvey && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedSurvey(null)}
        >
          <div
            className="survey-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {selectedSurvey.monitoring_location ||
                    "Wildlife Survey"}
                </h2>

                <div className="modal-location">
                  Survey Details
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedSurvey(null)}
                aria-label="Close survey details"
              >
                ×
              </button>
            </div>

            <div className="modal-grid">
              <div className="modal-field full">
                <span className="modal-field-label">
                  Monitoring Location
                </span>

                <span className="modal-field-value">
                  {selectedSurvey.monitoring_location ||
                    "Not available"}
                </span>
              </div>

              <div className="modal-field">
                <span className="modal-field-label">
                  Habitat
                </span>

                <span className="modal-field-value">
                  {selectedSurvey.habitat_type ||
                    "Not available"}
                </span>
              </div>

              <div className="modal-field">
                <span className="modal-field-label">
                  Protected Area
                </span>

                <span className="modal-field-value">
                  {selectedSurvey.protected_area ||
                    "Not available"}
                </span>
              </div>

              <div className="modal-field">
                <span className="modal-field-label">
                  Latitude
                </span>

                <span className="modal-field-value">
                  {selectedSurvey.latitude ??
                    "Not available"}
                </span>
              </div>

              <div className="modal-field">
                <span className="modal-field-label">
                  Longitude
                </span>

                <span className="modal-field-value">
                  {selectedSurvey.longitude ??
                    "Not available"}
                </span>
              </div>

              <div className="modal-field">
                <span className="modal-field-label">
                  Survey Date
                </span>

                <span className="modal-field-value">
                  {formatDate(selectedSurvey.survey_date)}
                </span>
              </div>

              <div className="modal-field">
                <span className="modal-field-label">
                  AI Observations
                </span>

                <span className="modal-field-value">
                  {getObservationCount(selectedSurvey.id)}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-button"
                onClick={() => setSelectedSurvey(null)}
              >
                Close
              </button>

              {onCreateSurvey && (
                <button
                  type="button"
                  className="modal-button primary"
                  onClick={() => {
                    setSelectedSurvey(null);
                    onCreateSurvey();
                  }}
                >
                  + Create New Survey
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Surveys;