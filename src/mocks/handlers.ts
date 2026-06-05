import { http, HttpResponse } from "msw";
import carePathSeed from "@/mocks/data/care-path.json";
import dashboardSeed from "@/mocks/data/dashboard.json";
import knowledgeSeed from "@/mocks/data/knowledge.json";
import patientsSeed from "@/mocks/data/patients.json";
import robotsSeed from "@/mocks/data/robots.json";

export const handlers = [
  http.get("/api/dashboard/seed", () => HttpResponse.json(dashboardSeed)),
  http.get("/api/knowledge/seed", () => HttpResponse.json(knowledgeSeed)),
  http.get("/api/patients/seed", () => HttpResponse.json(patientsSeed)),
  http.get("/api/care-path/seed", () => HttpResponse.json(carePathSeed)),
  http.get("/api/robots/seed", () => HttpResponse.json(robotsSeed))
];
