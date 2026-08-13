CREATE TABLE `rootCauseInvestigations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`investigationKey` varchar(255) NOT NULL,
	`problemTitle` varchar(255) NOT NULL,
	`problemDescription` text NOT NULL,
	`sourceType` varchar(50) NOT NULL,
	`sourceId` int,
	`evidenceStrength` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`overallConfidence` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`contributorsJson` text NOT NULL,
	`counterEvidenceJson` text NOT NULL,
	`unknownFactorsJson` text NOT NULL,
	`timelineEventsJson` text NOT NULL,
	`whyTreeJson` text NOT NULL,
	`status` enum('OPEN','INVESTIGATING','RESOLVED','ARCHIVED') NOT NULL DEFAULT 'OPEN',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rootCauseInvestigations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `rootCauseInvestigations_businessId_idx` ON `rootCauseInvestigations` (`businessId`);--> statement-breakpoint
CREATE INDEX `rootCauseInvestigations_investigationKey_idx` ON `rootCauseInvestigations` (`investigationKey`);