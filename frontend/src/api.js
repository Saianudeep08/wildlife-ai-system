import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export const login = (email, password) =>
  API.post("/auth/login", { email, password });

export const register = (email, password, full_name, role) =>
  API.post("/auth/register", { email, password, full_name, role });

export const getSurveys = (token) =>
  API.get("/surveys/", { headers: { Authorization: `Bearer ${token}` } });

export const createSurvey = (data, token) =>
  API.post("/surveys/", data, { headers: { Authorization: `Bearer ${token}` } });

export const deleteSurvey = (surveyId, token) =>
  API.delete(`/surveys/${surveyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const uploadImage = (surveyId, file, token) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post(`/images/upload/${surveyId}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

export const uploadAudio = (surveyId, file, token) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post(`/audio/upload/${surveyId}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getObservations = (token) =>
  API.get("/images/observations", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getBiodiversity = (surveyId, token) =>
  API.get(`/analytics/biodiversity/${surveyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getPopulationTrends = (surveyId, token) =>
  API.get(`/analytics/population-trends/${surveyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getSurveyReport = (surveyId, token) =>
  API.get(`/reports/${surveyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export default API;
