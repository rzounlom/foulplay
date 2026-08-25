import { prisma } from "@/lib/db/prisma";
import { createPublicChaosLobbyRoom } from "@/lib/rooms/create-public-chaos-room";
import { emitPublicChaosEvent } from "@/lib/analytics/public-chaos-events";

jest.mock("@/lib/analytics/public-chaos-events", () => ({
  emitPublicChaosEvent: jest.fn(),
}));

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    room: { findUnique: jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockEmit = emitPublicChaosEvent as jest.MockedFunction<
  typeof emitPublicChaosEvent
>;

describe("createPublicChaosLobbyRoom", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.room.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it("always sets isPublicChaos and allowJoinInProgress true", async () => {
    const mockTx = {
      room: {
        create: jest.fn().mockResolvedValue({ id: "rid", code: "ZZZZZZ" }),
      },
      player: { create: jest.fn().mockResolvedValue({}) },
    };
    (mockPrisma.$transaction as jest.Mock).mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
      cb(mockTx),
    );

    await createPublicChaosLobbyRoom({ id: "user_1" });

    expect(mockTx.room.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isPublicChaos: true,
        allowJoinInProgress: true,
      }),
    });
    expect(mockEmit).toHaveBeenCalledWith(
      "public_room_created",
      expect.objectContaining({ createdVia: "matchmaking", playerCount: 1 }),
    );
  });
});
