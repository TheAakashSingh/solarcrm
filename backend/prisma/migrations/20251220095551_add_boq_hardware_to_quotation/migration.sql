-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "boqGrossProfit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "boqProfitPercent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "costing" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "gst" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "hardwareGrossProfit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "hardwarePurchaseTotal" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "noOfTable" INTEGER,
ADD COLUMN     "nosOfModule" TEXT,
ADD COLUMN     "orderNo" TEXT,
ADD COLUMN     "projectCapacity" TEXT,
ADD COLUMN     "purchaseRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "ratePerKg" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalBoqAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalGrossProfit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalHardwareCost" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalProfitPercent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalStructurePlusHardware" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalWeight" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalWeightAfterHotDip" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "weightIncreaseAfterHDG" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "QuotationBoqItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "descriptions" TEXT NOT NULL,
    "type" TEXT,
    "specification" TEXT,
    "lengthMm" DOUBLE PRECISION,
    "requiredQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION DEFAULT 0,
    "weightPerPec" DOUBLE PRECISION DEFAULT 0,
    "qtyPerTable" DOUBLE PRECISION DEFAULT 0,
    "weightPerTable" DOUBLE PRECISION DEFAULT 0,
    "unitWeight" DOUBLE PRECISION DEFAULT 0,
    "purchaseRate" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationBoqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationHardwareItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "srNo" INTEGER NOT NULL,
    "descriptions" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchaseRate" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationHardwareItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationBoqItem_quotationId_idx" ON "QuotationBoqItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationHardwareItem_quotationId_idx" ON "QuotationHardwareItem"("quotationId");

-- AddForeignKey
ALTER TABLE "QuotationBoqItem" ADD CONSTRAINT "QuotationBoqItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationHardwareItem" ADD CONSTRAINT "QuotationHardwareItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
