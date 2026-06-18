-- DropIndex
DROP INDEX "stock_movements_idempotencyKey_key";

-- CreateIndex
CREATE INDEX "stock_movements_idempotencyKey_idx" ON "stock_movements"("idempotencyKey");
