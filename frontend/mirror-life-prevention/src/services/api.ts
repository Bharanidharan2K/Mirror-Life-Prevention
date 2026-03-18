import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

// Upload 4 data files — with real upload progress tracking
export async function uploadFiles(
  users: File, status: File, locations: File, personas: File,
  onProgress?: (percent: number) => void,
) {
  const form = new FormData();
  form.append("users", users);
  form.append("status", status);
  form.append("locations", locations);
  form.append("personas", personas);
  const res = await api.post("/api/upload", form, {
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return res.data;
}

// Run multi-agent analysis
export async function runAnalysis() {
  const res = await api.post("/api/analyze");
  return res.data;
}

// Get all citizens
export async function getCitizens() {
  const res = await api.get("/api/citizens");
  return res.data;
}

// Get one citizen detail
export async function getCitizenDetail(citizenId: string) {
  const res = await api.get(`/api/citizens/${citizenId}`);
  return res.data;
}

// Get health chart data
export async function getCitizenHealth(citizenId: string) {
  const res = await api.get(`/api/citizens/${citizenId}/health`);
  return res.data;
}

// RAG chat
export async function chat(message: string) {
  const res = await api.post("/api/chat", { message });
  return res.data;
}
