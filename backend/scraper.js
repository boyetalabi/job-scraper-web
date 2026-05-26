const fetch = require('node-fetch');

async function scrapeJobs(config) {
  const allJobs = [];
  
  const criteriaList = config.searchCriteria.split(',').map(c => c.trim());
  const urlList = config.targetUrls.split(',').map(u => u.trim());
  const maxDaysOld = parseInt(config.maxDaysOld) || 7;

  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDaysOld);

  for (const targetUrl of urlList) {
    if (!targetUrl.includes('pm.healthcaresource.com/CS/')) continue;
    
    // Extract portal name, e.g. "rwjbarnabashealth" from "https://pm.healthcaresource.com/CS/rwjbarnabashealth"
    const urlParts = targetUrl.split('pm.healthcaresource.com/CS/');
    if (urlParts.length < 2) continue;
    let portalName = urlParts[1].split('#')[0].split('?')[0].replace('/', '');

    const apiUrl = `https://pm.healthcaresource.com/JobseekerSearchAPI/${portalName}/api/Search?size=50`;

    for (const criteria of criteriaList) {
      const postData = {
        "query": {
          "bool": {
            "must": {
              "query_string": {
                "query": criteria,
                "fields": ["title"]
              }
            },
            "should": {
              "match": {
                "userArea.isFeaturedJob": { "query": true, "boost": 1 }
              }
            }
          }
        },
        "sort": [{"datePosted": "desc"}]
      };

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0'
          },
          body: JSON.stringify(postData)
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.hits && data.hits.hits) {
          data.hits.hits.forEach(hit => {
            const source = hit._source;
            const jobId = source.userArea && source.userArea.jobPostingID ? source.userArea.jobPostingID : source.documentId.split('_').pop();
            const jobUrl = `https://pm.healthcaresource.com/CS/${portalName}#/job/${jobId}`;
            
            // Check if job is older than maxDaysOld
            const jobDate = new Date(source.datePosted);
            if (jobDate < cutoffDate) {
              return; // Skip this job
            }

            // Ensure exact string match in title (case-insensitive)
            if (!source.title.toLowerCase().includes(criteria.toLowerCase())) {
              return; // Skip fuzzy matches returned by the portal
            }
            
            allJobs.push({
              id: source.documentId,
              title: source.title,
              location: source.jobLocation?.address?.addressLocality || 'Unknown',
              type: source.employmentType,
              datePosted: source.datePosted,
              url: jobUrl,
              matchedCriteria: criteria,
              portal: portalName
            });
          });
        }
      } catch (error) {
        console.error(`Failed to scrape for ${criteria} at ${portalName}:`, error.message);
      }
    }
  }

  // Deduplicate jobs by ID
  const uniqueJobs = Array.from(new Map(allJobs.map(job => [job.id, job])).values());
  return uniqueJobs;
}

module.exports = { scrapeJobs };
