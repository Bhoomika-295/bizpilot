CREATE TABLE `scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`scenarioType` varchar(50) NOT NULL DEFAULT 'CUSTOM',
	`assumptionsJson` text NOT NULL,
	`affectedAreasJson` text NOT NULL,
	`estimatedMetricsJson` text,
	`affectedSituationsJson` text,
	`strategicImplicationsJson` text,
	`evidenceQuality` varchar(50) NOT NULL DEFAULT 'MEDIUM EVIDENCE',
	`status` enum('DRAFT','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `scenarios_businessId_idx` ON `scenarios` (`businessId`);--> statement-breakpoint
CREATE INDEX `scenarios_status_idx` ON `scenarios` (`status`);