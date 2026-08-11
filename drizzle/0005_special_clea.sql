ALTER TABLE `recommendations` MODIFY COLUMN `status` enum('pending','accepted','rejected','completed','OPEN','COMPLETED','DISMISSED') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `recommendations` ADD `outcomeStatus` enum('Positive','Neutral','Negative','Unknown') DEFAULT 'Unknown';--> statement-breakpoint
ALTER TABLE `recommendations` ADD `outcomeNote` text;--> statement-breakpoint
ALTER TABLE `recommendations` ADD `metricBefore` decimal(12,2);--> statement-breakpoint
ALTER TABLE `recommendations` ADD `metricAfter` decimal(12,2);--> statement-breakpoint
ALTER TABLE `recommendations` ADD `observedChange` varchar(50);