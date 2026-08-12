CREATE TABLE `scenarioComparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`comparisonKey` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`scenarioIdsJson` text NOT NULL,
	`baselineScenarioId` int,
	`scorecardJson` text NOT NULL,
	`interpretation` text NOT NULL,
	`uncertainty` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenarioComparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenarioHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`previousStatus` varchar(30),
	`newStatus` varchar(30),
	`detailsJson` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenarioHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scenarios` MODIFY COLUMN `status` enum('DRAFT','ACTIVE','UNDER_REVIEW','SELECTED','COMPLETED','INVALIDATED','ARCHIVED') NOT NULL DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE `scenarios` ADD `pathKey` varchar(120);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `actionsJson` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `affectedMetricsJson` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `expectedDirectionJson` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `risksJson` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `opportunitiesJson` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `evidenceJson` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `expectedOutcome` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `timeHorizon` varchar(80);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `confidence` varchar(20);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `uncertainty` varchar(20);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `strategicFit` varchar(20);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `strategicFitReason` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `trajectoryAlignment` varchar(20);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `trajectoryAlignmentReason` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `monitoringStatus` varchar(40);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `selectedDecisionId` int;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `outcomeId` int;--> statement-breakpoint
CREATE INDEX `scenarioComparisons_businessId_idx` ON `scenarioComparisons` (`businessId`);--> statement-breakpoint
CREATE INDEX `scenarioComparisons_comparisonKey_idx` ON `scenarioComparisons` (`businessId`,`comparisonKey`);--> statement-breakpoint
CREATE INDEX `scenarioComparisons_updatedAt_idx` ON `scenarioComparisons` (`businessId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `scenarioHistory_businessId_idx` ON `scenarioHistory` (`businessId`);--> statement-breakpoint
CREATE INDEX `scenarioHistory_scenarioId_idx` ON `scenarioHistory` (`businessId`,`scenarioId`);--> statement-breakpoint
CREATE INDEX `scenarioHistory_timestamp_idx` ON `scenarioHistory` (`businessId`,`timestamp`);