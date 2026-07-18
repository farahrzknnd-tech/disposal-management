import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

function Broken(): JSX.Element { throw new Error("boom"); }

describe("ErrorBoundary", () => {
  it("renders fallback", () => {
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(screen.getByText("Aplikasi bermasalah")).toBeInTheDocument();
  });
});
