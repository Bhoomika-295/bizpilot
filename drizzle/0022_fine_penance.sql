CREATE TABLE `externalEventReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`eventId` int NOT NULL,
	`action` varchar(40) NOT NULL,
	`previousStatus` varchar(30),
	`newStatus` varchar(30),
	`rationale` text,
	`evidenceJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `externalEventReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `externalEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`source` varchar(255) NOT NULL,
	`sourceType` varchar(50) NOT NULL DEFAULT 'MARKET_SIGNAL',
	`title` varchar(512) NOT NULL,
	`summary` text NOT NULL,
	`referenceUrl` text NOT NULL,
	`publishedAt` timestamp,
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`topic` varchar(160) NOT NULL DEFAULT 'GENERAL_MARKET',
	`entitiesJson` text,
	`geography` varchar(160),
	`eventType` varchar(60) NOT NULL DEFAULT 'OTHER',
	`evidenceStrength` varchar(40) NOT NULL DEFAULT 'MEDIUM',
	`freshness` varchar(40) NOT NULL DEFAULT 'CURRENT',
	`status` varchar(30) NOT NULL DEFAULT 'NEW',
	`normalizationKey` varchar(255) NOT NULL,
	`fingerprint` varchar(255) NOT NULL,
	`relevanceLevel` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`relevanceReason` text,
	`impactType` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`impactAreasJson` text,
	`strategyImpact` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`strategyImpactReason` text,
	`objectiveImpactsJson` text,
	`trajectoryContextJson` text,
	`crossSignalContextJson` text,
	`trendKey` varchar(255),
	`trendState` varchar(30) NOT NULL DEFAULT 'ONE_OFF',
	`trendConfidence` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`watchItemsJson` text,
	`linkedStrategyIdsJson` text,
	`linkedSituationIdsJson` text,
	`linkedOpportunityIdsJson` text,
	`linkedMonitoringEventId` int,
	`uncertainty` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `externalEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `externalRadarSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`fingerprint` varchar(255) NOT NULL,
	`eventIdsJson` text NOT NULL,
	`radarJson` text NOT NULL,
	`earlyWarningsJson` text NOT NULL,
	`trendGroupsJson` text NOT NULL,
	`sourceFreshnessJson` text NOT NULL,
	`lastEvaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `externalRadarSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `externalEventReviews_businessId_idx` ON `externalEventReviews` (`businessId`);--> statement-breakpoint
CREATE INDEX `externalEventReviews_eventId_idx` ON `externalEventReviews` (`businessId`,`eventId`);--> statement-breakpoint
CREATE INDEX `externalEventReviews_createdAt_idx` ON `externalEventReviews` (`businessId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `externalEvents_businessId_idx` ON `externalEvents` (`businessId`);--> statement-breakpoint
CREATE INDEX `externalEvents_status_idx` ON `externalEvents` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `externalEvents_fingerprint_idx` ON `externalEvents` (`businessId`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `externalEvents_normalization_idx` ON `externalEvents` (`businessId`,`normalizationKey`);--> statement-breakpoint
CREATE INDEX `externalEvents_publishedAt_idx` ON `externalEvents` (`businessId`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `externalRadarSnapshots_businessId_idx` ON `externalRadarSnapshots` (`businessId`);--> statement-breakpoint
CREATE INDEX `externalRadarSnapshots_fingerprint_idx` ON `externalRadarSnapshots` (`businessId`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `externalRadarSnapshots_evaluatedAt_idx` ON `externalRadarSnapshots` (`businessId`,`lastEvaluatedAt`);