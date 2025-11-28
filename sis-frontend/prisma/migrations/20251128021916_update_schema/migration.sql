/*
  Warnings:

  - You are about to drop the `_empresa` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `empresa_funcionario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `empresa_usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `empresa_funcionario` DROP FOREIGN KEY `empresa_funcionario_id_empresa_fkey`;

-- DropForeignKey
ALTER TABLE `empresa_usuario` DROP FOREIGN KEY `empresa_usuario_id_empresa_fkey`;

-- DropTable
DROP TABLE `_empresa`;

-- DropTable
DROP TABLE `empresa_funcionario`;

-- DropTable
DROP TABLE `empresa_usuario`;

-- CreateTable
CREATE TABLE `tab_administrador` (
    `id_administrador` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id_administrador`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_empresa` (
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
CREATE TABLE `tab_empresa_funcionario` (
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
CREATE TABLE `tab_empresa_has_trilha` (
    `id_empresa` INTEGER NOT NULL,
    `id_trilha` INTEGER NOT NULL,

    PRIMARY KEY (`id_empresa`, `id_trilha`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_empresa_relatorio` (
    `id_relatorio` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(191) NOT NULL,
    `data_publicacao` DATETIME(3) NULL,
    `texto` VARCHAR(191) NULL,
    `id_empresa` INTEGER NOT NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,
    `file_key` VARCHAR(191) NULL,
    `file_name` VARCHAR(191) NULL,
    `version_suffix` INTEGER NULL DEFAULT 1,

    PRIMARY KEY (`id_relatorio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_empresa_usuario` (
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

-- CreateTable
CREATE TABLE `tab_escala` (
    `id_escala` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `data_vencimento` DATETIME(3) NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_escala`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_escala_has_empresa` (
    `id_escala` INTEGER NOT NULL,
    `id_empresa` INTEGER NOT NULL,

    PRIMARY KEY (`id_escala`, `id_empresa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_escala_pergunta` (
    `id_pergunta` INTEGER NOT NULL AUTO_INCREMENT,
    `pergunta` VARCHAR(191) NOT NULL,
    `id_escala` INTEGER NOT NULL,
    `valor_inicial_favoravel` DECIMAL(10, 2) NULL,
    `valor_final_favoravel` DECIMAL(10, 2) NULL,
    `valor_inicial_intermediario` DECIMAL(10, 2) NULL,
    `valor_final_intermediario` DECIMAL(10, 2) NULL,
    `valor_inicial_risco` DECIMAL(10, 2) NULL,
    `valor_final_risco` DECIMAL(10, 2) NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_pergunta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_escala_pergunta_resposta` (
    `id_resposta` INTEGER NOT NULL AUTO_INCREMENT,
    `resposta` VARCHAR(191) NOT NULL,
    `id_pergunta` INTEGER NOT NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_resposta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_resposta_funcionario` (
    `id_resposta_funcionario` INTEGER NOT NULL AUTO_INCREMENT,
    `data_resposta` DATETIME(3) NULL,
    `id_resposta` INTEGER NULL,
    `id_pergunta` INTEGER NULL,
    `id_escala` INTEGER NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_resposta_funcionario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_trilha` (
    `id_trilha` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `data_criacao` DATETIME(3) NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_trilha`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_trilha_item` (
    `id_itens` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NULL,
    `data` DATETIME(3) NULL,
    `detalhes` VARCHAR(191) NULL,
    `id_trilha` INTEGER NOT NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_itens`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tab_empresa_funcionario` ADD CONSTRAINT `tab_empresa_funcionario_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `tab_empresa`(`id_empresa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_empresa_has_trilha` ADD CONSTRAINT `tab_empresa_has_trilha_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `tab_empresa`(`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_empresa_has_trilha` ADD CONSTRAINT `tab_empresa_has_trilha_id_trilha_fkey` FOREIGN KEY (`id_trilha`) REFERENCES `tab_trilha`(`id_trilha`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_empresa_relatorio` ADD CONSTRAINT `tab_empresa_relatorio_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `tab_empresa`(`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_empresa_usuario` ADD CONSTRAINT `tab_empresa_usuario_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `tab_empresa`(`id_empresa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_escala_has_empresa` ADD CONSTRAINT `tab_escala_has_empresa_id_escala_fkey` FOREIGN KEY (`id_escala`) REFERENCES `tab_escala`(`id_escala`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_escala_has_empresa` ADD CONSTRAINT `tab_escala_has_empresa_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `tab_empresa`(`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_escala_pergunta` ADD CONSTRAINT `tab_escala_pergunta_id_escala_fkey` FOREIGN KEY (`id_escala`) REFERENCES `tab_escala`(`id_escala`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_escala_pergunta_resposta` ADD CONSTRAINT `tab_escala_pergunta_resposta_id_pergunta_fkey` FOREIGN KEY (`id_pergunta`) REFERENCES `tab_escala_pergunta`(`id_pergunta`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_resposta_funcionario` ADD CONSTRAINT `tab_resposta_funcionario_id_resposta_fkey` FOREIGN KEY (`id_resposta`) REFERENCES `tab_escala_pergunta_resposta`(`id_resposta`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_resposta_funcionario` ADD CONSTRAINT `tab_resposta_funcionario_id_pergunta_fkey` FOREIGN KEY (`id_pergunta`) REFERENCES `tab_escala_pergunta`(`id_pergunta`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_resposta_funcionario` ADD CONSTRAINT `tab_resposta_funcionario_id_escala_fkey` FOREIGN KEY (`id_escala`) REFERENCES `tab_escala`(`id_escala`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_trilha_item` ADD CONSTRAINT `tab_trilha_item_id_trilha_fkey` FOREIGN KEY (`id_trilha`) REFERENCES `tab_trilha`(`id_trilha`) ON DELETE CASCADE ON UPDATE CASCADE;
