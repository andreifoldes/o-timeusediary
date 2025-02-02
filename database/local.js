import { createTimelineDataFrame } from '../utils.js';

export function sendData() {
    // Get flattened timeline data from the timeline manager
    const timelineData = createTimelineDataFrame();
    
    // Gather any study parameters (if provided) and build CSV file headers
    const studyHeaders = Object.keys(window.timelineManager.study || {});
    const headers = ['timelineKey', 'activity', 'category', 'startTime', 'endTime', ...studyHeaders];
    
    // Process timeline data to populate proper activity and category values using associated DOM elements
    const processedData = timelineData.map(row => {
        const activityBlock = document.querySelector(`.activity-block[data-id="${row.id}"]`);
        if (activityBlock) {
            return {
                ...row,
                activity: activityBlock.querySelector('div')?.textContent || row.activity,
                category: activityBlock.dataset.category || row.category
            };
        }
        return row;
    });
    
    // Build CSV content:
    const csvContent = [
        headers.join(','),
        ...processedData.map(row => 
            headers.map(header => 
                // Wrap each value in quotes and escape any quotes
                `"${String(row[header] || '').replace(/"/g, '""')}"`
            ).join(',')
        )
    ].join('\n');
    
    // Create a blob for the CSV data and trigger a download:
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const today = new Date();
    const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
    link.download = `${dateStr}_timeline_activities.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Data exported as CSV:', timelineData);
    
    // Check for a redirect URL in settings, and if found, append current URL parameters and redirect after a short delay.
    fetch('settings/activities.json')
        .then(response => response.json())
        .then(data => {
            const redirectUrl = data.general?.redirect_url;
            if (redirectUrl) {
                // Append all current URL parameters to the redirect URL
                const currentParams = new URLSearchParams(window.location.search);
                const finalUrl = new URL(redirectUrl);
                currentParams.forEach((value, key) => {
                    finalUrl.searchParams.append(key, value);
                });
                
                // Use a small delay to ensure the file download starts before redirecting.
                setTimeout(() => {
                    window.location.href = finalUrl.toString();
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Error checking redirect URL:', error);
        });
}
