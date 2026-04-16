import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthorRoute } from "@/components/AuthorRoute";
import type { Project } from "@/types";

function RegisterProbe() {
  const { register, username } = useAuth();

  return (
    <div>
      <button onClick={() => register("viewer@test.com", "secret123", "ChosenName")}>register</button>
      <span data-testid="username">{username}</span>
    </div>
  );
}

describe("author panel auth flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses typed username during register", async () => {
    render(
      <AuthProvider>
        <RegisterProbe />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "register" }));

    expect(screen.getByTestId("username")).toHaveTextContent("ChosenName");
  });

  it("redirects non-author away from author route", () => {
    window.localStorage.setItem("auth_state", JSON.stringify({
      isAuthenticated: true,
      username: "viewer",
      role: "viewer",
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
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("persists created projects into localStorage and reloads from it", async () => {
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
    const raw = window.localStorage.getItem("morneven_projects");

    expect(raw).not.toBeNull();
    expect(raw).toContain("Persistence Test");

    vi.resetModules();
    const serviceB = await import("@/services/api");
    const projects = await serviceB.getProjects();

    expect(projects.some((p) => p.id === created.id)).toBe(true);
  });
});
