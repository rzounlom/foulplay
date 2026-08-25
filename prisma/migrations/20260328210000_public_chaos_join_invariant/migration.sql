-- Public chaos rooms always allow join-in-progress (repair legacy inconsistent rows)
UPDATE "Room"
SET "allowJoinInProgress" = true
WHERE "isPublicChaos" = true AND "allowJoinInProgress" = false;
