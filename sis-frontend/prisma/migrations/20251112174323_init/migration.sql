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

-- CreateTable
CREATE TABLE `empresa_funcionario` (
    `id_funcionario` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NULL,
    `gestor` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `data_nascimento` DATETIME(3) NULL,
    `cidade_nascimento` VARCHAR(191) NULL,
    `id_empresa` INTEGER NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_funcionario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empresa_usuario` (
    `id_usuario_rh` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NULL,
    `data_nascimento` DATETIME(3) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(191) NULL,
    `gestor` VARCHAR(191) NULL,
    `cidade` VARCHAR(191) NULL,
    `senha_hash` VARCHAR(191) NULL,
    `id_empresa` INTEGER NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_usuario_rh`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `empresa_funcionario` ADD CONSTRAINT `empresa_funcionario_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `_empresa`(`id_empresa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `empresa_usuario` ADD CONSTRAINT `empresa_usuario_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `_empresa`(`id_empresa`) ON DELETE SET NULL ON UPDATE CASCADE;
