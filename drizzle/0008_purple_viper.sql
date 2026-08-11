CREATE TABLE `decisionPriorities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`sourceType` varchar(50) NOT NULL DEFAULT 'SITUATION',
	`sourceId` int,
	`title` varchar(255) NOT NULL,
	`priorityLevel` varchar(50) NOT NULL DEFAULT 'MEDIUM',
	`priorityScore` int NOT NULL DEFAULT 50,
	`urgency` varchar(100) NOT NULL DEFAULT 'Normal',
	`impact` varchar(100) NOT NULL DEFAULT 'Moderate',
	`trend` varchar(50) NOT NULL DEFAULT 'STABLE',
	`reason` text NOT NULL,
	`whyNow` text NOT NULL,
	`evidenceJson` text NOT NULL,
	`freshnessNote` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `decisionPriorities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `decisionPriorities_businessId_idx` ON `decisionPriorities` (`businessId`);--> statement-breakpoint
CREATE INDEX `decisionPriorities_priorityScore_idx` ON `decisionPriorities` (`priorityScore`);