CREATE TABLE `businessMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`memoryType` varchar(50) NOT NULL DEFAULT 'SITUATION',
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`sourceType` varchar(50),
	`sourceId` int,
	`importance` varchar(30) NOT NULL DEFAULT 'MEDIUM',
	`status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
	`contextJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patternIntelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`patternType` varchar(60) NOT NULL DEFAULT 'RECURRING_SITUATION',
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`occurrences` int NOT NULL DEFAULT 1,
	`firstDetected` timestamp NOT NULL DEFAULT (now()),
	`lastDetected` timestamp NOT NULL DEFAULT (now()),
	`typicalResponse` text,
	`historicalOutcome` varchar(50) NOT NULL DEFAULT 'MIXED',
	`confidence` varchar(30) NOT NULL DEFAULT 'MEDIUM',
	`currentRelevance` varchar(30) NOT NULL DEFAULT 'HIGH',
	`lessonsLearned` text,
	`evidenceJson` text,
	`status` varchar(30) NOT NULL DEFAULT 'CONFIRMED',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patternIntelligence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `businessMemories_businessId_idx` ON `businessMemories` (`businessId`);--> statement-breakpoint
CREATE INDEX `businessMemories_type_idx` ON `businessMemories` (`businessId`,`memoryType`);--> statement-breakpoint
CREATE INDEX `businessMemories_source_idx` ON `businessMemories` (`businessId`,`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `businessMemories_importance_idx` ON `businessMemories` (`businessId`,`importance`);--> statement-breakpoint
CREATE INDEX `patternIntelligence_businessId_idx` ON `patternIntelligence` (`businessId`);--> statement-breakpoint
CREATE INDEX `patternIntelligence_type_idx` ON `patternIntelligence` (`businessId`,`patternType`);--> statement-breakpoint
CREATE INDEX `patternIntelligence_relevance_idx` ON `patternIntelligence` (`businessId`,`currentRelevance`);