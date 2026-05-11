export const VALIDATION_PROMPTS = {
  matcher: (plot: string) => `You are a cinematic knowledge engine.
The user has provided a plot description. You need to identify real-world movies that match or are highly similar to this plot description!

PLOT DESCRIPTION FROM USER:
"${plot}"

Find up to 5 real movies that match this description. 
Rank them exactly according to their public average rating (e.g., IMDb rating where 10 is best). The highest-rated movie should be rank 1.

For each movie, provide:
- title
- description (brief synopsis)
- cast (array of strings, e.g. main 3-4 actors)
- director
- producer
- rating (number out of 10)
- rank (integer)
- matchReasoning (why this movie matches the user's description)
- posterSearchQuery (the title and year perfectly formatted to search for an image, e.g. "The Matrix 1999 official poster")

Return a JSON object with this exact structure (no markdown, pure JSON, start with { and end with }):
{
  "movies": [
    {
      "title": "Movie Name",
      "description": "Synopsis...",
      "cast": ["Actor 1", "Actor 2"],
      "director": "Director Name",
      "producer": "Producer Name",
      "rating": 8.5,
      "rank": 1,
      "matchReasoning": "Matches because...",
      "posterSearchQuery": "Movie Name 2024 poster"
    }
  ]
}`,

  conversation: (movies: string, history: string, userMessage: string) => `You are an expert film consultant. 
You recently helped the user find these movies based on their plot description.
MOVIES WE RECOMMENDED:
${movies}

Answer any follow up questions about those movies, the cast, the directors, or recommend similar ones based on those results!

CONVERSATION HISTORY:
${history}

USER QUESTION: ${userMessage}`
};
