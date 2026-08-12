CREATE TABLE `strategyHealthSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`strategyId` int NOT NULL,
	`healthState` varchar(50) NOT NULL DEFAULT 'HEALTHY',
	`objectivePerformance` varchar(50) NOT NULL DEFAULT 'ON_TRACK',
	`trajectoryAlignment` varchar(50) NOT NULL DEFAULT 'ON_TRACK',
	`assumptionState` varchar(50) NOT NULL DEFAULT 'VALIDATED',
	`environmentFit` varchar(50) NOT NULL DEFAULT 'STABLE',
	`historicalEvidence` varchar(50) NOT NULL DEFAULT 'MIXED',
	`strategicFit` varchar(50) NOT NULL DEFAULT 'HIGH',
	`dataConfidence` varchar(50) NOT NULL DEFAULT 'HIGH',
	`reviewPriority` varchar(50) NOT NULL DEFAULT 'LOW',
	`evidenceSummaryJson` text,
	`reviewQuestionsJson` text,
	`lastEvaluatedAt` timestamp NOT NULL DEFAULT (now()),
	`nextReviewAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategyHealthSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategyReviewEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`strategyId` int NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`reviewPriority` varchar(50) NOT NULL DEFAULT 'MEDIUM',
	`reason` text NOT NULL,
	`evidenceJson` text,
	`reviewerDecision` varchar(50),
	`changeReasonCategory` varchar(60),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategyReviewEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `strategyHealthSnapshots_businessId_idx` ON `strategyHealthSnapshots` (`businessId`);--> statement-breakpoint
CREATE INDEX `strategyHealthSnapshots_strategyId_idx` ON `strategyHealthSnapshots` (`strategyId`);--> statement-breakpoint
CREATE INDEX `strategyReviewEvents_businessId_idx` ON `strategyReviewEvents` (`businessId`);--> statement-breakpoint
CREATE INDEX `strategyReviewEvents_strategyId_idx` ON `strategyReviewEvents` (`strategyId`);