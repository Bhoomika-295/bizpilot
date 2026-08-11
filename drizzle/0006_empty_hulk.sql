CREATE TABLE `businessSituations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`priority` varchar(50) NOT NULL DEFAULT 'MEDIUM',
	`status` varchar(50) NOT NULL DEFAULT 'ACTIVE',
	`category` varchar(100) NOT NULL DEFAULT 'Stable',
	`supportingSignalsJson` text NOT NULL,
	`supportingCount` int NOT NULL DEFAULT 0,
	`freshnessInfo` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessSituations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `businessSituations` (`businessId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `businessSituations` (`status`);