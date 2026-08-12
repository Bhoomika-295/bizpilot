CREATE TABLE `dailyBriefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`briefDate` varchar(30) NOT NULL,
	`executiveOpening` text NOT NULL,
	`healthSummaryJson` text NOT NULL,
	`changesSummaryJson` text NOT NULL,
	`attentionSummaryJson` text NOT NULL,
	`externalRadarJson` text NOT NULL,
	`opportunitiesThreatsJson` text NOT NULL,
	`strategyStatusJson` text NOT NULL,
	`decisionsSummaryJson` text NOT NULL,
	`outcomesJson` text NOT NULL,
	`fingerprint` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyBriefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `dailyBriefs_businessId_idx` ON `dailyBriefs` (`businessId`);--> statement-breakpoint
CREATE INDEX `dailyBriefs_briefDate_idx` ON `dailyBriefs` (`briefDate`);