/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActivityHeatmap } from './ActivityHeatmap';
import type { DayDatasetType } from './DayDatasetType';
import type { HourDatasetType } from './HourDatasetType';
import type { LocaleDataset } from './LocaleDataset';
import type { UserAgentAnalysisData } from './UserAgentAnalysisData';
import type { WeekDatasetType } from './WeekDatasetType';
export type PlatformStats = {
    weekDataset: WeekDatasetType;
    dayDataset: DayDatasetType;
    hourDataset: HourDatasetType;
    activityHeatmap: ActivityHeatmap;
    localeDataset: LocaleDataset;
    userAgentDataset: UserAgentAnalysisData;
    botDataset: {
        won: number;
        total: number;
    };
};

