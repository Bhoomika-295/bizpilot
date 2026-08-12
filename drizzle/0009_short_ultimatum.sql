CREATE TABLE `strategyEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`recommendationId` int,
	`eventType` varchar(100) NOT NULL,
	`previousStrategyTitle` varchar(255),
	`newStrategyTitle` varchar(255),
	`evaluationResult` varchar(50),
	`reason` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategyEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategyStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`recommendationId` int NOT NULL,
	`supportingSituationIdsJson` text,
	`supportingSignalIdsJson` text,
	`priorityAtGeneration` varchar(50),
	`situationTrendAtGeneration` varchar(50),
	`metricSnapshotJson` text,
	`marketSignalRefsJson` text,
	`evaluationStatus` enum('KEEP','UPDATE','DEPRIORITIZE','REPLACE','EXPIRED','ACTIVE','COMPLETED','DISMISSED') DEFAULT 'KEEP',
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategyStates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `strategyEvents` (`businessId`);--> statement-breakpoint
CREATE INDEX `recommendationId_idx` ON `strategyEvents` (`recommendationId`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `strategyEvents` (`timestamp`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `strategyStates` (`businessId`);--> statement-breakpoint
CREATE INDEX `recommendationId_idx` ON `strategyStates` (`recommendationId`);