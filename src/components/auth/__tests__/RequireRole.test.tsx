import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireRole } from "../RequireRole";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ loading: false, hasRole: (roles: string[]) => roles.includes("ADMIN") }) }));

describe("RequireRole", () => {
  it("allows matching role", () => {
    render(<MemoryRouter initialEntries={["/"]}><Routes><Route element={<RequireRole roles={["ADMIN"]} />}><Route path="/" element={<div>allowed</div>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText("allowed")).toBeInTheDocument();
  });
});
