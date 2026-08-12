CREATE TABLE `businessTrajectories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`metricKey` varchar(80) NOT NULL,
	`metricLabel` varchar(120) NOT NULL,
	`currentValue` decimal(18,2),
	`previousValue` decimal(18,2),
	`direction` enum('IMPROVING','DECLINING','STABLE','VOLATILE','INSUFFICIENT_DATA') NOT NULL,
	`momentum` enum('ACCELERATING','DECELERATING','STABLE','UNKNOWN') NOT NULL,
	`forecastWindow` int,
	`projectedValue` decimal(18,2),
	`projectedDirection` varchar(80),
	`confidenceLevel` enum('HIGH','MEDIUM','LOW','UNKNOWN') NOT NULL,
	`dataSufficiency` enum('HIGH','MEDIUM','LOW','INSUFFICIENT') NOT NULL,
	`volatility` enum('LOW','MEDIUM','HIGH','UNKNOWN') NOT NULL,
	`status` enum('HEALTHY_GROWTH','STABLE','SLOWING_GROWTH','EARLY_DECLINE','ACCELERATING_DECLINE','RECOVERING','VOLATILE','INSUFFICIENT_DATA') NOT NULL,
	`evidenceCount` int NOT NULL DEFAULT 0,
	`freshness` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`lastObservedAt` timestamp,
	`evidenceJson` text NOT NULL,
	`supportingSignalsJson` text NOT NULL,
	`contradictingSignalsJson` text NOT NULL,
	`earlyWarningsJson` text NOT NULL,
	`explanation` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessTrajectories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trajectoryForecastSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`trajectoryId` int NOT NULL,
	`metricKey` varchar(80) NOT NULL,
	`forecastWindow` int NOT NULL,
	`forecastedAt` timestamp NOT NULL DEFAULT (now()),
	`observedThrough` timestamp NOT NULL,
	`currentValue` decimal(18,2),
	`projectedValue` decimal(18,2),
	`projectedDirection` varchar(80),
	`trajectoryStatus` varchar(40) NOT NULL,
	`confidenceLevel` varchar(20) NOT NULL,
	`dataSufficiency` varchar(20) NOT NULL,
	`evidenceJson` text NOT NULL,
	`actualValue` decimal(18,2),
	`actualObservedAt` timestamp,
	`comparisonStatus` varchar(40),
	`comparisonNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trajectoryForecastSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trajectoryHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`trajectoryId` int NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`previousStatus` varchar(40),
	`newStatus` varchar(40),
	`detailsJson` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trajectoryHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trajectoryLearningSignals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`forecastSnapshotId` int NOT NULL,
	`metricKey` varchar(80) NOT NULL,
	`signalType` varchar(40) NOT NULL,
	`evidenceJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trajectoryLearningSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `businessTrajectories_businessId_idx` ON `businessTrajectories` (`businessId`);--> statement-breakpoint
CREATE INDEX `businessTrajectories_metricKey_idx` ON `businessTrajectories` (`businessId`,`metricKey`);--> statement-breakpoint
CREATE INDEX `businessTrajectories_status_idx` ON `businessTrajectories` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `businessTrajectories_updatedAt_idx` ON `businessTrajectories` (`businessId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `trajectoryForecastSnapshots_businessId_idx` ON `trajectoryForecastSnapshots` (`businessId`);--> statement-breakpoint
CREATE INDEX `trajectoryForecastSnapshots_trajectoryId_idx` ON `trajectoryForecastSnapshots` (`businessId`,`trajectoryId`);--> statement-breakpoint
CREATE INDEX `trajectoryForecastSnapshots_metricKey_idx` ON `trajectoryForecastSnapshots` (`businessId`,`metricKey`);--> statement-breakpoint
CREATE INDEX `trajectoryForecastSnapshots_forecastedAt_idx` ON `trajectoryForecastSnapshots` (`businessId`,`forecastedAt`);--> statement-breakpoint
CREATE INDEX `trajectoryHistory_businessId_idx` ON `trajectoryHistory` (`businessId`);--> statement-breakpoint
CREATE INDEX `trajectoryHistory_trajectoryId_idx` ON `trajectoryHistory` (`businessId`,`trajectoryId`);--> statement-breakpoint
CREATE INDEX `trajectoryHistory_timestamp_idx` ON `trajectoryHistory` (`businessId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `trajectoryLearningSignals_businessId_idx` ON `trajectoryLearningSignals` (`businessId`);--> statement-breakpoint
CREATE INDEX `trajectoryLearningSignals_snapshotId_idx` ON `trajectoryLearningSignals` (`businessId`,`forecastSnapshotId`);--> statement-breakpoint
CREATE INDEX `trajectoryLearningSignals_metricKey_idx` ON `trajectoryLearningSignals` (`businessId`,`metricKey`);