export const getLatestSubmissionDate = submissions => (
  submissions.reduce((latestDate, submission) => {
    const submissionDate = submission?.submission_date
    if (!submissionDate) return latestDate
    return !latestDate || submissionDate > latestDate
      ? submissionDate
      : latestDate
  }, null)
)
