-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "username" TEXT,
    "firstName" TEXT,
    "nativeLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'iniciante',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "phrasesPerDay" INTEGER,
    "timezone" TEXT,
    "welcomedAt" TIMESTAMP(3),
    "conversationState" TEXT,
    "tempWord" TEXT,
    "fraseCountToday" INTEGER NOT NULL DEFAULT 0,
    "lastFraseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhraseSent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentenceTarget" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhraseSent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "article" TEXT,
    "wordType" TEXT,
    "translation" TEXT NOT NULL,
    "description" TEXT,
    "example" TEXT,
    "userId" TEXT NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "PhraseSent_userId_idx" ON "PhraseSent"("userId");

-- CreateIndex
CREATE INDEX "PhraseSent_userId_sentAt_idx" ON "PhraseSent"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "Word_userId_idx" ON "Word"("userId");

-- AddForeignKey
ALTER TABLE "PhraseSent" ADD CONSTRAINT "PhraseSent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
