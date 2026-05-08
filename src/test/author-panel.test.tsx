import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthorRoute } from "@/components/AuthorRoute";
import type { Project } from "@/types";

function RegisterProbe() {
  const { register, username } = useAuth();

  return (
    <div>
      <button onClick={() => register("personel@test.com", "secret123456", "ChosenName")}>register</button>
      <span data-testid="username">{username}</span>
    </div>
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let projects: Project[] = [];

function installApiMock() {
  projects = [];

  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(requestUrl);
    const path = url.pathname.replace(/^\/api/, "");
    const method = init?.method ?? "GET";
    const payload = init?.body ? JSON.parse(String(init.body)) : {};

    if (path === "/auth/register" && method === "POST") {
      return jsonResponse({
        token: "test-token",
        refreshToken: "test-refresh-token",
        user: {
          id: "user-1",
          email: payload.email,
          username: payload.username,
          role: "personel",
          level: 1,
          track: "executive",
        },
      });
    }

    if (path === "/projects" && method === "POST") {
      const created: Project = {
        id: `project-${projects.length + 1}`,
        ...payload,
      };
      projects.push(created);
      return jsonResponse(created);
    }

    if (path === "/projects" && method === "GET") {
      return jsonResponse(projects);
    }

    return jsonResponse({ message: "Route not found" }, 404);
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.resetModules();
  installApiMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("author panel auth flow", () => {

  it("uses typed username during register", async () => {
    render(
      <AuthProvider>
        <RegisterProbe />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "register" }));

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("ChosenName"));
  });

  it("redirects non-author away from author route", () => {
    window.localStorage.setItem("auth_state", JSON.stringify({
      isAuthenticated: true,
      username: "personel",
      role: "personel",
    }));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/author"]}>
          <Routes>
            <Route path="/home" element={<div>home page</div>} />
            <Route
              path="/author"
              element={(
                <AuthorRoute>
                  <div>author page</div>
                </AuthorRoute>
              )}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("allows author into author route", () => {
    window.localStorage.setItem("auth_state", JSON.stringify({
      isAuthenticated: true,
      username: "author",
      role: "author",
    }));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/author"]}>
          <Routes>
            <Route path="/home" element={<div>home page</div>} />
            <Route
              path="/author"
              element={(
                <AuthorRoute>
                  <div>author page</div>
                </AuthorRoute>
              )}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText("author page")).toBeInTheDocument();
  });
});

describe("author panel data persistence", () => {
  it("creates projects through REST and reloads them from the backend", async () => {
    const serviceA = await import("@/services/api");

    const payload: Omit<Project, "id"> = {
      title: "Persistence Test",
      status: "Planning",
      thumbnail: "",
      shortDesc: "desc",
      fullDesc: "full",
      patches: [],
      docs: [],
    };

    const created = await serviceA.createProject(payload);

    vi.resetModules();
    const serviceB = await import("@/services/api");
    const projects = await serviceB.getProjects();

    expect(projects.some((p) => p.id === created.id)).toBe(true);
  });
});
