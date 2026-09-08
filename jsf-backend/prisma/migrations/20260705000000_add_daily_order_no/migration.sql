-- AlterTable
ALTER TABLE `Order` ADD COLUMN `dailyNo` INTEGER NULL,
    ADD COLUMN `businessDay` VARCHAR(10) NULL;

-- CreateIndex
CREATE INDEX `Order_businessDay_dailyNo_idx` ON `Order`(`businessDay`, `dailyNo`);

-- CreateTable
CREATE TABLE `DailyOrderCounter` (
    `businessDay` VARCHAR(10) NOT NULL,
    `lastNo` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`businessDay`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
