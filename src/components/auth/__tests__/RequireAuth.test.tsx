import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../RequireAuth";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ loading: false, session: { user: { id: "u" } } }) }));

describe("RequireAuth", () => {
  it("renders protected child for active session", () => {
    render(<MemoryRouter initialEntries={["/"]}><Routes><Route element={<RequireAuth />}><Route path="/" element={<div>protected</div>} /></Route></Routes></MemoryRouter>);
    expect(screen.getByText("protected")).toBeInTheDocument();
  });
});
