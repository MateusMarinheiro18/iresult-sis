/*
  Warnings:

  - You are about to drop the column `valor_final_favoravel` on the `tab_escala_pergunta` table. All the data in the column will be lost.
  - You are about to drop the column `valor_final_intermediario` on the `tab_escala_pergunta` table. All the data in the column will be lost.
  - You are about to drop the column `valor_final_risco` on the `tab_escala_pergunta` table. All the data in the column will be lost.
  - You are about to drop the column `valor_inicial_favoravel` on the `tab_escala_pergunta` table. All the data in the column will be lost.
  - You are about to drop the column `valor_inicial_intermediario` on the `tab_escala_pergunta` table. All the data in the column will be lost.
  - You are about to drop the column `valor_inicial_risco` on the `tab_escala_pergunta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `tab_escala_pergunta` DROP COLUMN `valor_final_favoravel`,
    DROP COLUMN `valor_final_intermediario`,
    DROP COLUMN `valor_final_risco`,
    DROP COLUMN `valor_inicial_favoravel`,
    DROP COLUMN `valor_inicial_intermediario`,
    DROP COLUMN `valor_inicial_risco`,
    ADD COLUMN `id_categoria` INTEGER NULL,
    ADD COLUMN `id_modulo` INTEGER NULL,
    ADD COLUMN `ordem` INTEGER NULL;

-- AlterTable
ALTER TABLE `tab_escala_pergunta_resposta` ADD COLUMN `valor` INTEGER NULL;

-- CreateTable
CREATE TABLE `tab_escala_categoria` (
    `id_categoria` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `id_modulo` INTEGER NOT NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tab_escala_modulo` (
    `id_modulo` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
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

    PRIMARY KEY (`id_modulo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tab_escala_categoria` ADD CONSTRAINT `tab_escala_categoria_id_modulo_fkey` FOREIGN KEY (`id_modulo`) REFERENCES `tab_escala_modulo`(`id_modulo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_escala_modulo` ADD CONSTRAINT `tab_escala_modulo_id_escala_fkey` FOREIGN KEY (`id_escala`) REFERENCES `tab_escala`(`id_escala`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_escala_pergunta` ADD CONSTRAINT `tab_escala_pergunta_id_modulo_fkey` FOREIGN KEY (`id_modulo`) REFERENCES `tab_escala_modulo`(`id_modulo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_escala_pergunta` ADD CONSTRAINT `tab_escala_pergunta_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `tab_escala_categoria`(`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE;
