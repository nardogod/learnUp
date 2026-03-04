import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@prisma/client";

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  word: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  phraseSent: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("./db", () => ({ prisma: mockPrisma }));
vi.mock("./telegram", () => ({ sendMessage: vi.fn().mockResolvedValue(true) }));
vi.mock("./llm", () => ({ generatePhrase: vi.fn().mockResolvedValue(null) }));

const mockUser: User = {
  id: "u1",
  telegramId: "123",
  email: null,
  name: "Test",
  username: null,
  firstName: null,
  nativeLanguage: "português",
  targetLanguage: "svenska",
  level: "iniciante",
  plan: "free",
  phrasesPerDay: null,
  timezone: null,
  welcomedAt: new Date(),
  conversationState: "idle",
  tempWord: null,
  fraseCountToday: 0,
  lastFraseDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("handleMessage - state flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.word.count.mockResolvedValue(5);
    mockPrisma.user.update.mockResolvedValue(mockUser);
  });

  it("transitions idle -> aguardando_palavra on /addword", async () => {
    const { handleMessage } = await import("./states");
    const { sendMessage } = await import("./telegram");

    await handleMessage(mockUser, "/addword", "chat1");

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { conversationState: "aguardando_palavra" },
      })
    );
    expect(sendMessage).toHaveBeenCalledWith(
      "chat1",
      expect.stringContaining("palavra")
    );
  });

  it("transitions aguardando_palavra -> aguardando_significado on word input", async () => {
    const { handleMessage } = await import("./states");

    await handleMessage(
      { ...mockUser, conversationState: "aguardando_palavra" },
      "jag",
      "chat1"
    );

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          conversationState: "aguardando_significado",
          tempWord: "jag",
        },
      })
    );
  });

  it("cancels flow on /cancel", async () => {
    const { handleMessage } = await import("./states");

    await handleMessage(
      { ...mockUser, conversationState: "aguardando_palavra", tempWord: null },
      "/cancel",
      "chat1"
    );

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { conversationState: "idle", tempWord: null },
      })
    );
  });
});
