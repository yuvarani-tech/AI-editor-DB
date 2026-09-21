CREATE DATABASE IF NOT EXISTS `ai_text_editor`;
USE `ai_text_editor`;

CREATE TABLE IF NOT EXISTS `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `theme` varchar(50) DEFAULT 'dark',
  `font_family` varchar(100) DEFAULT '''Inter'', sans-serif',
  `font_size` int(11) DEFAULT 16,
  `language` varchar(50) DEFAULT 'en-US',
  `voice_speed` float DEFAULT 1.0,
  `bg_color` varchar(20) DEFAULT '#0f172a',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings row if it doesn't exist
INSERT INTO `settings` (`id`, `theme`, `font_family`, `font_size`, `language`, `voice_speed`, `bg_color`) 
SELECT 1, 'dark', '''Inter'', sans-serif', 16, 'en-US', 1.0, '#0f172a'
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE `id` = 1);
