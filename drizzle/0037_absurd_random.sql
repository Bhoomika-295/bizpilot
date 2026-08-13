ALTER TABLE `actionPlans` ADD `dependencyIdsJson` text;--> statement-breakpoint
ALTER TABLE `actionPlans` ADD `expectedResult` text;--> statement-breakpoint
ALTER TABLE `actionPlans` ADD `executionHealth` varchar(30) DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE `actionPlans` ADD `executionHealthReason` text;--> statement-breakpoint
ALTER TABLE `actionPlans` ADD `blockedDurationHours` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `actionPlans` ADD `lastExecutionReviewAt` timestamp;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `decisionId` int;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `expectedResult` text;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `actualResultSummary` text;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `varianceStatus` varchar(30) DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `assumptionsReviewJson` text;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `dependencyReviewJson` text;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `decisionEffectiveness` varchar(30);--> statement-breakpoint
ALTER TABLE `outcomes` ADD `reviewConfidence` varchar(30);--> statement-breakpoint
ALTER TABLE `outcomes` ADD `reviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `outcomes` ADD `lessonMemoryId` int;