-- AlterTable
ALTER TABLE `tab_resposta_funcionario` ADD COLUMN `id_empresa` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `tab_resposta_funcionario` ADD CONSTRAINT `tab_resposta_funcionario_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `tab_empresa`(`id_empresa`) ON DELETE SET NULL ON UPDATE CASCADE;
