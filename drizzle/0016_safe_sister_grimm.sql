CREATE TABLE `signalClusters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`clusterKey` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`theme` varchar(50) NOT NULL DEFAULT 'OTHER',
	`interpretation` text NOT NULL,
	`relationshipType` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`strength` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`stability` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`freshness` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`evidenceCount` int NOT NULL DEFAULT 0,
	`relationshipIdsJson` text NOT NULL,
	`signalKeysJson` text NOT NULL,
	`evidenceJson` text NOT NULL,
	`relatedSituationIdsJson` text,
	`relatedOpportunityIdsJson` text,
	`relatedDecisionIdsJson` text,
	`relatedStrategyIdsJson` text,
	`relatedOutcomeIdsJson` text,
	`status` enum('NEW','ACTIVE','WEAKENING','RESOLVED') NOT NULL DEFAULT 'NEW',
	`firstObservedAt` timestamp NOT NULL DEFAULT (now()),
	`lastObservedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signalClusters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signalRelationshipHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`relationshipId` int NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`previousStatus` varchar(20),
	`newStatus` varchar(20),
	`previousStrength` varchar(20),
	`newStrength` varchar(20),
	`detailsJson` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signalRelationshipHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signalRelationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`relationshipKey` varchar(255) NOT NULL,
	`signalAType` varchar(50) NOT NULL,
	`signalAId` int,
	`signalAKey` varchar(128) NOT NULL,
	`signalBType` varchar(50) NOT NULL,
	`signalBId` int,
	`signalBKey` varchar(128) NOT NULL,
	`relationshipType` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`strength` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`evidenceCount` int NOT NULL DEFAULT 0,
	`stability` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`freshness` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`status` enum('NEW','ACTIVE','WEAKENING','RESOLVED') NOT NULL DEFAULT 'NEW',
	`firstObservedAt` timestamp NOT NULL DEFAULT (now()),
	`lastObservedAt` timestamp NOT NULL DEFAULT (now()),
	`relatedSituationIdsJson` text,
	`relatedOpportunityIdsJson` text,
	`relatedDecisionIdsJson` text,
	`relatedStrategyIdsJson` text,
	`relatedOutcomeIdsJson` text,
	`evidenceJson` text NOT NULL,
	`whatWeKnowJson` text NOT NULL,
	`whatWeDontKnowJson` text NOT NULL,
	`explanation` text NOT NULL,
	`causalityStatus` varchar(30) NOT NULL DEFAULT 'NOT_ESTABLISHED',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signalRelationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `signalClusters_businessId_idx` ON `signalClusters` (`businessId`);--> statement-breakpoint
CREATE INDEX `signalClusters_clusterKey_idx` ON `signalClusters` (`clusterKey`);--> statement-breakpoint
CREATE INDEX `signalClusters_status_idx` ON `signalClusters` (`status`);--> statement-breakpoint
CREATE INDEX `signalClusters_lastObservedAt_idx` ON `signalClusters` (`lastObservedAt`);--> statement-breakpoint
CREATE INDEX `signalRelationshipHistory_businessId_idx` ON `signalRelationshipHistory` (`businessId`);--> statement-breakpoint
CREATE INDEX `signalRelationshipHistory_relationshipId_idx` ON `signalRelationshipHistory` (`relationshipId`);--> statement-breakpoint
CREATE INDEX `signalRelationshipHistory_timestamp_idx` ON `signalRelationshipHistory` (`timestamp`);--> statement-breakpoint
CREATE INDEX `signalRelationships_businessId_idx` ON `signalRelationships` (`businessId`);--> statement-breakpoint
CREATE INDEX `signalRelationships_relationshipKey_idx` ON `signalRelationships` (`relationshipKey`);--> statement-breakpoint
CREATE INDEX `signalRelationships_signalA_idx` ON `signalRelationships` (`signalAType`,`signalAId`);--> statement-breakpoint
CREATE INDEX `signalRelationships_signalB_idx` ON `signalRelationships` (`signalBType`,`signalBId`);--> statement-breakpoint
CREATE INDEX `signalRelationships_status_idx` ON `signalRelationships` (`status`);--> statement-breakpoint
CREATE INDEX `signalRelationships_lastObservedAt_idx` ON `signalRelationships` (`lastObservedAt`);