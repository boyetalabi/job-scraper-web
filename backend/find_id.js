async function test() {
  const apiUrl = 'https://pm.healthcaresource.com/JobseekerSearchAPI/rwjbarnabashealth/api/Search?size=1';
  const postData = {
    "query": {
      "bool": {
        "must": {
          "query_string": {
            "query": "nurse",
            "fields": ["title^4", "description^1", "userArea.jobSummary^1", "all_fields^1"]
          }
        }
      }
    },
    "sort": [{"datePosted": "desc"}]
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0'
    },
    body: JSON.stringify(postData)
  });

  const data = await response.json();
  const source = data.hits.hits[0]._source;
  
  // Let's print out all ID-like fields
  console.log("documentId:", source.documentId);
  console.log("jobId:", source.jobId);
  console.log("requisitionNumber:", source.requisitionNumber);
  console.log("jobPostingID:", source.userArea ? source.userArea.jobPostingID : undefined);
  console.log("id:", source.id);
  console.log("Job ID in keys?:", Object.keys(source).filter(k => k.toLowerCase().includes('id')));
  
  // also check root hit properties
  console.log("hit._id:", data.hits.hits[0]._id);
}

test();
