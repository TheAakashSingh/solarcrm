-- AlterEnum
ALTER TYPE "EnquiryStatus" ADD VALUE 'PurchaseCompleted';

-- AlterTable
ALTER TABLE "Enquiry" ALTER COLUMN "deliveryAddress" DROP NOT NULL;

-- CreateTable
CREATE TABLE "QuotationAttachment" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationAttachment_quotationId_idx" ON "QuotationAttachment"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationAttachment_uploadedBy_idx" ON "QuotationAttachment"("uploadedBy");

-- AddForeignKey
ALTER TABLE "QuotationAttachment" ADD CONSTRAINT "QuotationAttachment_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationAttachment" ADD CONSTRAINT "QuotationAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
