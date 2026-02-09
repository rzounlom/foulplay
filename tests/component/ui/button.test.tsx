import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and responds to click", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Create Room</Button>);
    const button = screen.getByRole("button", { name: /create room/i });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<Button disabled>Submit</Button>);
    expect(screen.getByRole("button", { name: /submit/i }).hasAttribute("disabled")).toBe(true);
  });

  it("renders as disabled when isLoading is true", () => {
    render(<Button isLoading>Submit</Button>);
    const button = screen.getByRole("button", { name: /submit/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("applies fullWidth class when fullWidth is true", () => {
    render(<Button fullWidth>Full width</Button>);
    const button = screen.getByRole("button", { name: /full width/i });
    expect(button.className).toContain("w-full");
  });

  it("submits form when type is submit", () => {
    const handleSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={handleSubmit}>
        <Button type="submit">Save</Button>
      </form>
    );
    expect(screen.getByRole("button", { name: /save/i }).getAttribute("type")).toBe("submit");
  });
});
