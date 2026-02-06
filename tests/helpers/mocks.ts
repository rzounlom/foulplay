/**
 * Mock helpers for testing
 */

export const mockUser = {
  id: "user_123",
  clerkId: "clerk_123",
  name: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockPlayer = {
  id: "player_123",
  userId: "user_123",
  roomId: "room_123",
  points: 0,
  isHost: true,
  nickname: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: mockUser,
};

export const mockRoom = {
  id: "room_123",
  code: "ABC123",
  hostId: "player_123",
  status: "lobby",
  mode: "casual",
  sport: "football",
  showPoints: false,
  handSize: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  players: [mockPlayer],
};

export const mockCard = {
  id: "card_123",
  sport: "football",
  title: "Test Card",
  description: "Test description",
  severity: "mild",
  type: "action",
  points: 1,
  createdAt: new Date(),
};

export const mockCardInstance = {
  id: "card_instance_123",
  roomId: "room_123",
  cardId: "card_123",
  drawnById: "player_123",
  status: "drawn",
  submissionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  card: mockCard,
  drawnBy: mockPlayer,
};

export const mockGameState = {
  id: "gamestate_123",
  roomId: "room_123",
  currentTurnPlayerId: "player_123",
  activeCardInstanceId: null,
  deckSeed: "test-seed",
  createdAt: new Date(),
  updatedAt: new Date(),
  currentTurnPlayer: mockPlayer,
  activeCardInstance: null,
};
