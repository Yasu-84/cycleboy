'use client';

import { useState } from 'react';
import type { RaceEntry } from '@/types/raceEntry';
import type { RaceRecentResult } from '@/types/raceRecentResult';
import type { RaceMatchResult } from '@/types/raceMatchResult';
import BasicInfoTab from './BasicInfoTab';
import RecentResultsTab from './RecentResultsTab';
import MatchResultsTab from './MatchResultsTab';
import FormationTab from './FormationTab';
import AIPredictionTab from './AIPredictionTab';
import BettingTab from './BettingTab';
import type { RacePrediction } from '@/types/racePrediction';
import styles from './entry.module.css';

interface EntryTabsProps {
    entries: RaceEntry[];
    recentResults: RaceRecentResult[];
    matchResults: RaceMatchResult[];
    prediction: RacePrediction | null;
}

const TABS = ['基本情報', '直近成績', '対戦表', '並び予想', 'AI予想', '買い目'] as const;
type TabName = (typeof TABS)[number];

export default function EntryTabs({
    entries,
    recentResults,
    matchResults,
    prediction,
}: EntryTabsProps) {
    const [activeTab, setActiveTab] = useState<TabName>('基本情報');

    return (
        <>
            {/* タブバー */}
            <div className={styles.tabBar} role="tablist">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* タブコンテンツ */}
            <div className={styles.tabContent}>
                {activeTab === '基本情報' && <BasicInfoTab entries={entries} />}
                {activeTab === '直近成績' && <RecentResultsTab results={recentResults} />}
                {activeTab === '対戦表' && <MatchResultsTab results={matchResults} />}
                {activeTab === '並び予想' && <FormationTab entries={entries} prediction={prediction} />}
                {activeTab === 'AI予想' && <AIPredictionTab prediction={prediction} />}
                {activeTab === '買い目' && <BettingTab prediction={prediction} />}
            </div>
        </>
    );
}
