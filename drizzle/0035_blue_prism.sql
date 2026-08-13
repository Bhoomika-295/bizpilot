ALTER TABLE `businessMemories` ADD `timePeriod` varchar(100);--> statement-breakpoint
ALTER TABLE `businessMemories` ADD `sourceOfTruth` varchar(150) DEFAULT 'BizPilot Entity Record';--> statement-breakpoint
ALTER TABLE `businessMemories` ADD `evidenceConfidence` varchar(30) DEFAULT 'MEDIUM' NOT NULL;--> statement-breakpoint
ALTER TABLE `businessMemories` ADD `validationStatus` varchar(40) DEFAULT 'NEW' NOT NULL;--> statement-breakpoint
ALTER TABLE `businessMemories` ADD `contradictionDetailsJson` text;--> statement-breakpoint
ALTER TABLE `businessMemories` ADD `conditionMetadataJson` text;--> statement-breakpoint
ALTER TABLE `businessMemories` ADD `relevanceExplanation` text;--> statement-breakpoint
ALTER TABLE `patternIntelligence` ADD `patternState` varchar(40) DEFAULT 'REPEATED' NOT NULL;--> statement-breakpoint
ALTER TABLE `patternIntelligence` ADD `conditionPathJson` text;--> statement-breakpoint
CREATE INDEX `businessMemories_validation_idx` ON `businessMemories` (`businessId`,`validationStatus`);