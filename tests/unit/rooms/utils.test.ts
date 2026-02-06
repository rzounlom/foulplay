import { generateRoomCode } from "@/lib/rooms/utils";

describe("Room Utils", () => {
  describe("generateRoomCode", () => {
    it("should generate a 6-character code", () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
    });

    it("should generate uppercase alphanumeric characters", () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it("should generate different codes on multiple calls", () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateRoomCode());
      }
      // Very unlikely to have duplicates in 100 calls, but possible
      // We just want to ensure it's not always the same
      expect(codes.size).toBeGreaterThan(1);
    });

    it("should only contain valid characters", () => {
      const code = generateRoomCode();
      const validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    });
  });
});
