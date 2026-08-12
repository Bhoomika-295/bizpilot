CREATE TABLE `monitoringEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`eventType` varchar(50) NOT NULL DEFAULT 'OTHER',
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`whatChanged` text NOT NULL,
	`whyMatters` text NOT NULL,
	`severity` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`priority` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`priorityScore` int NOT NULL DEFAULT 50,
	`sourceType` varchar(50) NOT NULL DEFAULT 'OTHER',
	`sourceId` int,
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`relatedSituationIdsJson` text,
	`relatedOpportunityIdsJson` text,
	`relatedCompetitorIdsJson` text,
	`relatedDecisionIdsJson` text,
	`relatedOutcomeIdsJson` text,
	`evidenceJson` text NOT NULL,
	`recommendedReview` text,
	`currentState` text,
	`fingerprint` varchar(255) NOT NULL,
	`status` enum('NEW','ACTIVE','ACKNOWLEDGED','RESOLVED','DISMISSED') NOT NULL DEFAULT 'NEW',
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`firstDetectedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`dismissedAt` timestamp,
	`dismissalReason` text,
	`lastEscalatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoringEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoringPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`enabledCategoriesJson` text,
	`minimumPriority` varchar(20) NOT NULL DEFAULT 'LOW',
	`minimumSeverity` varchar(20) NOT NULL DEFAULT 'LOW',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoringPreferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `monitoringEvents_businessId_idx` ON `monitoringEvents` (`businessId`);--> statement-breakpoint
CREATE INDEX `monitoringEvents_status_idx` ON `monitoringEvents` (`status`);--> statement-breakpoint
CREATE INDEX `monitoringEvents_fingerprint_idx` ON `monitoringEvents` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `monitoringEvents_detectedAt_idx` ON `monitoringEvents` (`detectedAt`);--> statement-breakpoint
CREATE INDEX `monitoringEvents_priorityScore_idx` ON `monitoringEvents` (`priorityScore`);--> statement-breakpoint
CREATE INDEX `monitoringPreferences_businessId_idx` ON `monitoringPreferences` (`businessId`);