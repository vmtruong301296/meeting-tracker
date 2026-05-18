-- AlterTable
ALTER TABLE `Group` ADD COLUMN `color` VARCHAR(20) NOT NULL DEFAULT 'amber';

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `assigneeId` VARCHAR(191) NULL,
    ADD COLUMN `assigneeNote` TEXT NULL,
    ADD COLUMN `deadline` DATETIME(3) NULL,
    ADD COLUMN `parentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `theme` ENUM('DARK', 'LIGHT') NOT NULL DEFAULT 'DARK';

-- CreateIndex
CREATE INDEX `Task_parentId_position_idx` ON `Task`(`parentId`, `position`);

-- CreateIndex
CREATE INDEX `Task_assigneeId_idx` ON `Task`(`assigneeId`);

-- CreateIndex
CREATE INDEX `Task_deadline_idx` ON `Task`(`deadline`);

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
