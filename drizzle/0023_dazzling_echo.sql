CREATE TABLE `attentionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`tier` varchar(20) NOT NULL DEFAULT 'WATCH',
	`sourceType` varchar(50) NOT NULL DEFAULT 'OTHER',
	`sourceId` int,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'SITUATION',
	`priority` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`priorityScore` int NOT NULL DEFAULT 50,
	`impact` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`urgency` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`strategicRelevance` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`trajectoryRelevance` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`evidenceStrength` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`freshness` varchar(20) NOT NULL DEFAULT 'FRESH',
	`crossSignalSupport` boolean NOT NULL DEFAULT false,
	`businessSpecificRelevance` text,
	`explanationJson` text NOT NULL,
	`status` enum('NEW','ACTIVE','ACKNOWLEDGED','IN_REVIEW','RESOLVED','DISMISSED','EXPIRED') NOT NULL DEFAULT 'NEW',
	`dismissalReason` varchar(50),
	`resolvedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attentionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attentionReviewLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`attentionItemId` int NOT NULL,
	`action` varchar(30) NOT NULL,
	`reason` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attentionReviewLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `attentionItems_businessId_idx` ON `attentionItems` (`businessId`);--> statement-breakpoint
CREATE INDEX `attentionItems_tier_idx` ON `attentionItems` (`tier`);--> statement-breakpoint
CREATE INDEX `attentionItems_status_idx` ON `attentionItems` (`status`);--> statement-breakpoint
CREATE INDEX `attentionItems_priorityScore_idx` ON `attentionItems` (`priorityScore`);--> statement-breakpoint
CREATE INDEX `attentionItems_source_idx` ON `attentionItems` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `attentionReviewLogs_businessId_idx` ON `attentionReviewLogs` (`businessId`);--> statement-breakpoint
CREATE INDEX `attentionReviewLogs_itemIdx` ON `attentionReviewLogs` (`attentionItemId`);