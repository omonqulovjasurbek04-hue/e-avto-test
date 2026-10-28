-- Staff number kinds for the identifier history (their own migration: a new enum value can only be
-- used after the transaction that adds it has committed).
ALTER TYPE "IdentifierKind" ADD VALUE 'MODERATOR';
ALTER TYPE "IdentifierKind" ADD VALUE 'FINANCE';
ALTER TYPE "IdentifierKind" ADD VALUE 'MANAGER';
ALTER TYPE "IdentifierKind" ADD VALUE 'ADMIN';
ALTER TYPE "IdentifierKind" ADD VALUE 'SUPERADMIN';
