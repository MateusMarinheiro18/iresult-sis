-- AlterTable
ALTER TABLE `tab_empresa_funcionario` ADD COLUMN `id_grupo` INTEGER NULL;

-- AlterTable
ALTER TABLE `tab_escala_has_empresa` ADD COLUMN `data_envio` DATETIME(3) NULL,
    ADD COLUMN `total_destinatarios` INTEGER NULL;

-- AlterTable
ALTER TABLE `tab_resposta_funcionario` ADD COLUMN `id_funcionario` INTEGER NULL;

-- CreateTable
CREATE TABLE `tab_empresa_grupo` (
    `id_grupo` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `id_empresa` INTEGER NOT NULL,
    `ativo` INTEGER NULL,
    `created` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `deleted` DATETIME(3) NULL,
    `deleted_by` INTEGER NULL,
    `updated` DATETIME(3) NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `tab_empresa_grupo_id_empresa_nome_key`(`id_empresa`, `nome`),
    PRIMARY KEY (`id_grupo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tab_empresa_funcionario` ADD CONSTRAINT `tab_empresa_funcionario_id_grupo_fkey` FOREIGN KEY (`id_grupo`) REFERENCES `tab_empresa_grupo`(`id_grupo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_empresa_grupo` ADD CONSTRAINT `tab_empresa_grupo_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `tab_empresa`(`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tab_resposta_funcionario` ADD CONSTRAINT `tab_resposta_funcionario_id_funcionario_fkey` FOREIGN KEY (`id_funcionario`) REFERENCES `tab_empresa_funcionario`(`id_funcionario`) ON DELETE SET NULL ON UPDATE CASCADE;
