import { prisma } from "@/lib/db/prisma";
import { pickPublicChaosRoom } from "@/lib/rooms/public-chaos-matchmaking";

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    room: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("pickPublicChaosRoom", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("still selects an active public chaos room when allowJoinInProgress is false in DB", async () => {
    const staleRow = {
      id: "r1",
      code: "LIVE01",
      isPublicChaos: true,
      status: "active",
      allowJoinInProgress: false,
      updatedAt: new Date(),
      players: [{ id: "p1" }, { id: "p2" }],
      gameState: { id: "gs1" },
    };

    (mockPrisma.room.findMany as jest.Mock)
      .mockResolvedValueOnce([staleRow])
      .mockResolvedValueOnce([]);

    const code = await pickPublicChaosRoom("user_x");
    expect(code).toBe("LIVE01");
  });
});
