CREATE TABLE `actionPlanEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`actionPlanId` int NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`previousStatus` varchar(20),
	`newStatus` varchar(20),
	`actorUserId` int NOT NULL,
	`detailsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `actionPlanEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `actionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`actionType` varchar(40) NOT NULL DEFAULT 'REVIEW',
	`status` enum('PROPOSED','APPROVED','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'PROPOSED',
	`priority` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`sourceType` varchar(40) NOT NULL DEFAULT 'MANUAL',
	`sourceId` int,
	`decisionId` int,
	`strategyId` int,
	`objectiveId` int,
	`situationId` int,
	`opportunityId` int,
	`threatId` int,
	`ownerUserId` int,
	`dueDate` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`blockedAt` timestamp,
	`completedBy` int,
	`expectedOutcome` text,
	`actualOutcome` text,
	`evidence` text,
	`blockReason` text,
	`completionNotes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actionPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `actionPlanEvents_businessId_idx` ON `actionPlanEvents` (`businessId`);--> statement-breakpoint
CREATE INDEX `actionPlanEvents_actionPlanId_idx` ON `actionPlanEvents` (`businessId`,`actionPlanId`);--> statement-breakpoint
CREATE INDEX `actionPlanEvents_createdAt_idx` ON `actionPlanEvents` (`businessId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `actionPlans_businessId_idx` ON `actionPlans` (`businessId`);--> statement-breakpoint
CREATE INDEX `actionPlans_status_idx` ON `actionPlans` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `actionPlans_dueDate_idx` ON `actionPlans` (`businessId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `actionPlans_ownerUserId_idx` ON `actionPlans` (`businessId`,`ownerUserId`);--> statement-breakpoint
CREATE INDEX `actionPlans_source_idx` ON `actionPlans` (`businessId`,`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `actionPlans_decisionId_idx` ON `actionPlans` (`businessId`,`decisionId`);--> statement-breakpoint
CREATE INDEX `actionPlans_strategyId_idx` ON `actionPlans` (`businessId`,`strategyId`);