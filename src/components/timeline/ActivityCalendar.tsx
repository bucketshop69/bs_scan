import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css'; // Import default styles
import { HeatmapValue } from '../../utils/timeline/processors'; // Use updated type

interface ActivityCalendarProps {
    data: HeatmapValue[]; // Expect array format
    daysInPast?: number;
}

// Helper function to get color based on level
const getTailwindColorClass = (level: "NONE" | "LOW" | "MEDIUM" | "HIGH") => {
    switch (level) {
        case 'HIGH': return 'color-emerald-600'; // Use class names for library
        case 'MEDIUM': return 'color-emerald-400';
        case 'LOW': return 'color-emerald-200';
        case 'NONE':
        default: return 'color-gray-800'; // Class for empty/default
    }
};

const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ data, daysInPast = 365 }) => {
    // Calculate start and end dates
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysInPast + 1);

    // Format dates for the library
    const formattedEndDate = endDate.toISOString().split('T')[0];
    const formattedStartDate = startDate.toISOString().split('T')[0];

    return (
        <div className="border border-bio-border rounded-lg p-4 bg-bio-surface mb-8 heatmap-container">
            <style jsx global>{`
                /* Basic styles from react-calendar-heatmap adjusted for Tailwind/Theme */
                .heatmap-container .react-calendar-heatmap text {
                    font-size: 8px; /* Smaller font size */
                    fill: var(--color-bio-text-secondary); /* Use CSS variable for text color */
                }

                .react-calendar-heatmap rect:hover {
                    stroke: #555;
                    stroke-width: 1px;
                }

                /* Color classes matching Tailwind */
                .react-calendar-heatmap .color-gray-800 {
                    fill: var(--color-bio-base-darker); /* Theme-aware empty color */
                }
                .react-calendar-heatmap .color-emerald-200 {
                    fill: #a7f3d0; /* Tailwind emerald-200 */
                }
                .react-calendar-heatmap .color-emerald-400 {
                    fill: #34d399; /* Tailwind emerald-400 */
                }
                .react-calendar-heatmap .color-emerald-600 {
                    fill: #059669; /* Tailwind emerald-600 */
                }
            `}</style>

            <CalendarHeatmap
                startDate={formattedStartDate}
                endDate={formattedEndDate}
                values={data} // Pass the prepared data array
                showWeekdayLabels={true}
                weekdayLabels={['S', 'M', 'T', 'W', 'T', 'F', 'S']}
                monthLabels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                showMonthLabels={true}
                classForValue={(value) => {
                    if (!value || !value.level) { // Check if value or level exists
                        return getTailwindColorClass('NONE');
                    }
                    // Use type assertion for our custom level property
                    return getTailwindColorClass((value as HeatmapValue).level);
                }}
                // Simplify tooltip handling - use library default or basic title
                titleForValue={(value: any) => {
                    if (!value || !value.date) return '';
                    // Access count and level assuming it matches our HeatmapValue structure
                    return `${value.date}: ${value.count || 0} transaction${(value.count || 0) !== 1 ? 's' : ''}`;
                }}
                onClick={(value: any) => {
                    if (value && value.date) {
                        console.log(`Clicked on ${value.date} with count ${value.count || 0}`);
                    }
                }}
            />

            {/* Legend */}
            <div className="flex justify-end items-center mt-2 text-xs text-bio-text-secondary">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm mx-1 bg-[var(--color-bio-base-darker)]"></div> {/* Use actual background color */}
                <div className="w-3 h-3 rounded-sm mx-1 bg-[#a7f3d0]"></div>
                <div className="w-3 h-3 rounded-sm mx-1 bg-[#34d399]"></div>
                <div className="w-3 h-3 rounded-sm mx-1 bg-[#059669]"></div>
                <span>More</span>
            </div>
        </div>
    );
};

export default ActivityCalendar; 