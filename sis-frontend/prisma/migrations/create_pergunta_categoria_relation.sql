
-- Criar tabela de relação many-to-many
CREATE TABLE IF NOT EXISTS `escala_pergunta_categoria` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pergunta_id` INT NOT NULL,
  `categoria_id` INT NOT NULL,
  `ordem` INT NOT NULL DEFAULT 0,
  `created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `escala_pergunta_categoria_pergunta_id_categoria_id_key` (`pergunta_id`, `categoria_id`),
  KEY `escala_pergunta_categoria_pergunta_id_idx` (`pergunta_id`),
  KEY `escala_pergunta_categoria_categoria_id_idx` (`categoria_id`),
  CONSTRAINT `escala_pergunta_categoria_pergunta_id_fkey` 
    FOREIGN KEY (`pergunta_id`) REFERENCES `escala_pergunta` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `escala_pergunta_categoria_categoria_id_fkey` 
    FOREIGN KEY (`categoria_id`) REFERENCES `escala_categoria` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Remover constraint antiga se existir (id_categoria direto na pergunta)
ALTER TABLE `escala_pergunta` 
  DROP FOREIGN KEY IF EXISTS `escala_pergunta_id_categoria_fkey`;

-- Opcional: remover coluna id_categoria se ela existir
-- ALTER TABLE `escala_pergunta` DROP COLUMN IF EXISTS `id_categoria`;
