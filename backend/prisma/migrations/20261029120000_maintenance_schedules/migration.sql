-- CreateTable
CREATE TABLE `MaintenanceSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `carId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('APK', 'SERVICE', 'REPAIR', 'TIRES', 'OTHER') NOT NULL DEFAULT 'SERVICE',
    `intervalKm` INTEGER NULL,
    `intervalMonths` INTEGER NULL,
    `warnKm` INTEGER NULL,
    `warnDays` INTEGER NULL,
    `startDate` DATE NOT NULL,
    `startOdo` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_MaintenanceActionToMaintenanceSchedule` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_MaintenanceActionToMaintenanceSchedule_AB_unique`(`A`, `B`),
    INDEX `_MaintenanceActionToMaintenanceSchedule_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MaintenanceSchedule` ADD CONSTRAINT `MaintenanceSchedule_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `Car`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MaintenanceActionToMaintenanceSchedule` ADD CONSTRAINT `_MaintenanceActionToMaintenanceSchedule_A_fkey` FOREIGN KEY (`A`) REFERENCES `MaintenanceAction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_MaintenanceActionToMaintenanceSchedule` ADD CONSTRAINT `_MaintenanceActionToMaintenanceSchedule_B_fkey` FOREIGN KEY (`B`) REFERENCES `MaintenanceSchedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

