CREATE TABLE `strategyVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`strategyId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`objective` varchar(255) NOT NULL,
	`targetMetric` varchar(255),
	`proposedActions` text,
	`expectedOutcome` text,
	`timeframe` varchar(100),
	`assumptions` text,
	`risks` text,
	`confidence` decimal(3,2),
	`changeReasonCategory` varchar(60),
	`rationale` text NOT NULL,
	`evidenceJson` text,
	`reviewEventId` int,
	`versionStatus` varchar(30) NOT NULL DEFAULT 'DRAFT',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategyVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `strategyVersions_businessId_idx` ON `strategyVersions` (`businessId`);--> statement-breakpoint
CREATE INDEX `strategyVersions_strategyId_idx` ON `strategyVersions` (`businessId`,`strategyId`);--> statement-breakpoint
CREATE INDEX `strategyVersions_version_idx` ON `strategyVersions` (`businessId`,`strategyId`,`versionNumber`);