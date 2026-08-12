CREATE TABLE `decisionCandidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`decisionKey` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'OTHER',
	`priority` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`priorityScore` int NOT NULL DEFAULT 50,
	`urgency` varchar(30) NOT NULL DEFAULT 'MONITOR',
	`potentialImpact` varchar(30) NOT NULL DEFAULT 'MEDIUM',
	`evidenceStrength` varchar(30) NOT NULL DEFAULT 'MEDIUM',
	`confidence` varchar(30) NOT NULL DEFAULT 'MEDIUM',
	`sourceType` varchar(50) NOT NULL DEFAULT 'OTHER',
	`relatedSituationIdsJson` text,
	`relatedOpportunityIdsJson` text,
	`relatedCompetitorIdsJson` text,
	`relatedSignalIdsJson` text,
	`relatedScenarioIdsJson` text,
	`relatedStrategyIdsJson` text,
	`evidenceChainJson` text NOT NULL,
	`whyMatters` text NOT NULL,
	`whatWeKnowJson` text NOT NULL,
	`whatWeDontKnowJson` text NOT NULL,
	`potentialConsequences` text NOT NULL,
	`reversibility` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`actionOptionsJson` text NOT NULL,
	`recommendedNextStep` text,
	`recommendedNextStepReason` text,
	`strategicAlignment` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
	`strategicAlignmentReason` text,
	`dependencyText` text,
	`conflictKeysJson` text,
	`status` enum('OPEN','IN_REVIEW','DECIDED','DEFERRED','DISMISSED','EXPIRED') NOT NULL DEFAULT 'OPEN',
	`outcomeId` int,
	`sourceFingerprint` varchar(255) NOT NULL,
	`lastEvaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `decisionCandidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decisionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`decisionId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`previousStatus` varchar(30),
	`newStatus` varchar(30),
	`detailsJson` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decisionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `decisionCandidates_businessId_idx` ON `decisionCandidates` (`businessId`);--> statement-breakpoint
CREATE INDEX `decisionCandidates_status_idx` ON `decisionCandidates` (`status`);--> statement-breakpoint
CREATE INDEX `decisionCandidates_priorityScore_idx` ON `decisionCandidates` (`priorityScore`);--> statement-breakpoint
CREATE INDEX `decisionCandidates_decisionKey_idx` ON `decisionCandidates` (`decisionKey`);--> statement-breakpoint
CREATE INDEX `decisionEvents_businessId_idx` ON `decisionEvents` (`businessId`);--> statement-breakpoint
CREATE INDEX `decisionEvents_decisionId_idx` ON `decisionEvents` (`decisionId`);--> statement-breakpoint
CREATE INDEX `decisionEvents_timestamp_idx` ON `decisionEvents` (`timestamp`);