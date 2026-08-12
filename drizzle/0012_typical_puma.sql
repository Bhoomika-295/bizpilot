CREATE TABLE `competitorActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`competitorId` int NOT NULL,
	`activityType` varchar(50) NOT NULL DEFAULT 'OTHER',
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`sourceReference` varchar(512),
	`relevanceLevel` varchar(50) NOT NULL DEFAULT 'MEDIUM',
	`impactAreasJson` text NOT NULL,
	`activityTrend` varchar(50) NOT NULL DEFAULT 'STABLE',
	`strategicRelevance` text,
	`detectedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitorActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `competitorActivities_businessId_idx` ON `competitorActivities` (`businessId`);--> statement-breakpoint
CREATE INDEX `competitorActivities_competitorId_idx` ON `competitorActivities` (`competitorId`);--> statement-breakpoint
CREATE INDEX `competitorActivities_detectedAt_idx` ON `competitorActivities` (`detectedAt`);