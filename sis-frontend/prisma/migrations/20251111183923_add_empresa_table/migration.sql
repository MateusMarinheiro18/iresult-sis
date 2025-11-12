-- CreateTable
CREATE TABLE `_empresa` (
    `id_empresa` INTEGER NOT NULL AUTO_INCREMENT,
    `razao_social` VARCHAR(191) NOT NULL,
    `CNPJ` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `CEP` VARCHAR(191) NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_empresa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
