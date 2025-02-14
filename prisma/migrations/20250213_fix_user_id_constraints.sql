-- First drop existing foreign key constraints
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorId_fkey";
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_userId_fkey";

-- Modify columns to match User id type
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" TYPE TEXT;
ALTER TABLE "Account" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE "Session" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE "Activity" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE "PhiAccess" ALTER COLUMN "userId" TYPE TEXT;
ALTER TABLE "AccessLog" ALTER COLUMN "userId" TYPE TEXT;

-- Now we can safely modify the User table
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_pkey" CASCADE;
ALTER TABLE "User" ALTER COLUMN "id" SET DATA TYPE TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- Recreate the foreign key constraints
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PhiAccess" ADD CONSTRAINT "PhiAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
