CREATE TABLE `situationSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`situationId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`priority` varchar(50) NOT NULL DEFAULT 'MEDIUM',
	`status` varchar(50) NOT NULL DEFAULT 'ACTIVE',
	`category` varchar(100) NOT NULL DEFAULT 'Stable',
	`trendDirection` varchar(50) NOT NULL DEFAULT 'STABLE',
	`supportingCount` int NOT NULL DEFAULT 0,
	`internalEvidenceCount` int NOT NULL DEFAULT 0,
	`externalEvidenceCount` int NOT NULL DEFAULT 0,
	`metricValuesJson` text,
	`freshnessInfo` varchar(255),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `situationSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `situationSnapshots_businessId_idx` ON `situationSnapshots` (`businessId`);--> statement-breakpoint
CREATE INDEX `situationSnapshots_situationId_idx` ON `situationSnapshots` (`situationId`);--> statement-breakpoint
CREATE INDEX `situationSnapshots_timestamp_idx` ON `situationSnapshots` (`timestamp`);