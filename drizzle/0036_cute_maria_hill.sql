ALTER TABLE `decisionCandidates` ADD `tradeOffsJson` text;--> statement-breakpoint
ALTER TABLE `decisionCandidates` ADD `qualityMetricsJson` text;--> statement-breakpoint
ALTER TABLE `decisionCandidates` ADD `makerUserId` int;--> statement-breakpoint
ALTER TABLE `decisionCandidates` ADD `makerNote` text;--> statement-breakpoint
ALTER TABLE `decisionCandidates` ADD `versionNumber` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `decisionCandidates` ADD `parentDecisionId` int;